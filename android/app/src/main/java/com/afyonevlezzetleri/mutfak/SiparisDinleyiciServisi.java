package com.afyonevlezzetleri.mutfak;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class SiparisDinleyiciServisi extends Service {

    public static final String PREFS_ADI = "afyon_mutfak_prefs";
    public static final String OZEL_ZIL_DOSYA_ADI = "ozel_zil_sesi.audio";
    public static final String ACTION_BASLAT = "com.afyonevlezzetleri.mutfak.BASLAT";
    public static final String ACTION_SUSTUR = "com.afyonevlezzetleri.mutfak.SUSTUR";
    public static final String ACTION_DURDUR = "com.afyonevlezzetleri.mutfak.DURDUR";
    public static final String ACTION_ANLIK_CAL = "com.afyonevlezzetleri.mutfak.ANLIK_CAL";

    private static final String KANAL_SERVIS_ID = "afyon_mutfak_servis_v1";
    private static final String KANAL_ALARM_ID = "afyon_mutfak_alarm_v1";
    private static final int SERVIS_BILDIRIM_ID = 1001;
    private static final int ALARM_BILDIRIM_ID = 2001;

    private static final String FIREBASE_PROJECT_ID = "tfy-smart-fishing-511521";
    private static final String FIRESTORE_DB_ID = "ai-studio-afyonevlezzetler-373e291d-b34e-4126-ac5e-613533550d71";
    private static final String FIREBASE_API_KEY = "AIzaSyDiyim-knoseypbgWphWupiCaHqw9VHi6g";

    private static final Set<String> M1_ESLESENLER = new HashSet<>(Arrays.asList(
            "m1", "asci_fatma_01", "mutfak-fatma-teyze", "mutfak-1"
    ));

    private ScheduledExecutorService zamanlayici;
    private ScheduledExecutorService durdurZamanlayici;
    private MediaPlayer alarmOynatici;
    private PowerManager.WakeLock wakeLock;
    private final Set<String> bilinenSiparisIdleri = new HashSet<>();
    private boolean ilkYukleme = true;
    private String aktifAlarmSiparisId = null;
    public static volatile boolean uygulamaOnPlanda = false;

    @Override
    public void onCreate() {
        super.onCreate();
        kanallariOlustur();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_BASLAT;

        if (ACTION_SUSTUR.equals(action)) {
            alarmiSustur();
            bildirimiKaldir();
            return START_STICKY;
        }

        if (ACTION_DURDUR.equals(action)) {
            alarmiSustur();
            bildirimiKaldir();
            durdurVeKapat();
            return START_NOT_STICKY;
        }

        if (ACTION_ANLIK_CAL.equals(action)) {
            String baslik = intent != null ? intent.getStringExtra("baslik") : null;
            String detay = intent != null ? intent.getStringExtra("detay") : null;
            boolean kesintisiz = intent == null || intent.getBooleanExtra("kesintisiz", true);
            int sureSn = intent != null ? intent.getIntExtra("sure_sn", 5) : 5;
            if (baslik == null || baslik.isEmpty()) baslik = "🚨 YENİ MUTFAK SİPARİŞİ!";
            if (detay == null || detay.isEmpty()) detay = "Yeni sipariş geldi — Hemen onaylayın!";
            wakeLockAl();
            sireniCal(kesintisiz ? 300 : Math.max(2, sureSn));
            titret();
            yuksekOncelikliBildirimGosterOzel(baslik, detay);
            return START_STICKY;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_ADI, Context.MODE_PRIVATE);
        String mutfakId = prefs.getString("mutfak_id", "");
        String mutfakAdi = prefs.getString("mutfak_adi", "Afyon Ev Mutfağı");

        if (mutfakId == null || mutfakId.isEmpty()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        Notification servisBildirimi = servisBildirimiOlustur(mutfakAdi);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(SERVIS_BILDIRIM_ID, servisBildirimi, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(SERVIS_BILDIRIM_ID, servisBildirimi);
        }

        dinlemeyiBaslat();
        return START_STICKY;
    }

    private void dinlemeyiBaslat() {
        if (zamanlayici != null && !zamanlayici.isShutdown()) {
            return;
        }
        ilkYukleme = true;
        bilinenSiparisIdleri.clear();

        zamanlayici = Executors.newSingleThreadScheduledExecutor();
        zamanlayici.scheduleWithFixedDelay(new Runnable() {
            @Override
            public void run() {
                try {
                    siparisleriKontrolEt();
                } catch (Throwable ignored) {
                }
            }
        }, 0, 7, TimeUnit.SECONDS);
    }

    private void siparisleriKontrolEt() {
        SharedPreferences prefs = getSharedPreferences(PREFS_ADI, Context.MODE_PRIVATE);
        String mutfakId = prefs.getString("mutfak_id", "");
        boolean acikMi = prefs.getBoolean("mutfak_acik", true);
        boolean tumMutfaklar = prefs.getBoolean("tum_mutfaklar", false);
        String ekKimliklerJson = prefs.getString("ek_kimlikler", "[]");

        if (mutfakId == null || mutfakId.isEmpty() || !acikMi) {
            return;
        }

        Set<String> gecerliKimlikler = new HashSet<>();
        gecerliKimlikler.add(mutfakId);
        try {
            JSONArray arr = new JSONArray(ekKimliklerJson);
            for (int i = 0; i < arr.length(); i++) {
                String k = arr.optString(i, "");
                if (!k.isEmpty()) gecerliKimlikler.add(k);
            }
        } catch (Throwable ignored) {
        }

        boolean varsayilanMutfak = false;
        for (String k : gecerliKimlikler) {
            if (M1_ESLESENLER.contains(k)) {
                varsayilanMutfak = true;
                break;
            }
        }
        if (varsayilanMutfak) {
            gecerliKimlikler.addAll(M1_ESLESENLER);
        }

        String endpoint = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID
                + "/databases/" + FIRESTORE_DB_ID
                + "/documents:runQuery?key=" + FIREBASE_API_KEY;

        HttpURLConnection conn = null;
        try {
            URL url = new URL(endpoint);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setConnectTimeout(9000);
            conn.setReadTimeout(9000);
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");

            String sorguGovde = "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"siparisler\"}],\"limit\":100}}";
            byte[] govdeBayt = sorguGovde.getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(govdeBayt);
                os.flush();
            }

            int code = conn.getResponseCode();
            if (code != 200) return;

            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8)
            );
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            reader.close();

            JSONArray sonuclar = new JSONArray(sb.toString());

            if (ilkYukleme) {
                for (int i = 0; i < sonuclar.length(); i++) {
                    JSONObject satir = sonuclar.optJSONObject(i);
                    JSONObject doc = satir != null ? satir.optJSONObject("document") : null;
                    String docId = docIdCikar(doc);
                    if (!docId.isEmpty()) bilinenSiparisIdleri.add(docId);
                }
                ilkYukleme = false;
                return;
            }

            boolean aktifAlarmHalaBeklemede = false;

            for (int i = 0; i < sonuclar.length(); i++) {
                JSONObject satir = sonuclar.optJSONObject(i);
                JSONObject doc = satir != null ? satir.optJSONObject("document") : null;
                if (doc == null) continue;
                String docId = docIdCikar(doc);
                if (docId.isEmpty()) continue;

                JSONObject fields = doc.optJSONObject("fields");
                if (fields == null) continue;

                String sipMutfakId = alanMetin(fields, "mutfak_id");
                if (sipMutfakId.isEmpty()) sipMutfakId = alanMetin(fields, "mutfakId");
                String durum = alanMetin(fields, "durum");
                if (durum.isEmpty()) durum = "beklemede";

                boolean mutfakUygun = tumMutfaklar
                        || (sipMutfakId.isEmpty() && varsayilanMutfak)
                        || gecerliKimlikler.contains(sipMutfakId);

                boolean beklemedeMi = "beklemede".equals(durum);
                if (mutfakUygun && beklemedeMi) {
                    aktifAlarmHalaBeklemede = true;
                    if (!uygulamaOnPlanda && (alarmOynatici == null || !alarmOynatici.isPlaying())) {
                        String kod = alanMetin(fields, "siparis_kodu");
                        if (kod.isEmpty()) kod = alanMetin(fields, "siparisKodu");
                        if (kod.isEmpty()) kod = docId;

                        String musteri = alanMetin(fields, "musteri_adi");
                        if (musteri.isEmpty()) musteri = "Müşteri";

                        double tutar = alanSayi(fields, "toplam_tutar");
                        if (tutar <= 0) tutar = alanSayi(fields, "tutar");

                        aktifAlarmSiparisId = docId;
                        wakeLockAl();
                        sireniCal(300);
                        titret();
                        yuksekOncelikliBildirimGoster(kod, musteri, tutar);
                    }
                }

                if (!bilinenSiparisIdleri.contains(docId)) {
                    bilinenSiparisIdleri.add(docId);
                    boolean aktifSiparis = !"teslim_edildi".equals(durum) && !"iptal".equals(durum);
                    if (mutfakUygun && aktifSiparis) {
                        String kod = alanMetin(fields, "siparis_kodu");
                        if (kod.isEmpty()) kod = alanMetin(fields, "siparisKodu");
                        if (kod.isEmpty()) kod = docId;

                        String musteri = alanMetin(fields, "musteri_adi");
                        if (musteri.isEmpty()) musteri = "Müşteri";

                        double tutar = alanSayi(fields, "toplam_tutar");
                        if (tutar <= 0) tutar = alanSayi(fields, "tutar");

                        aktifAlarmSiparisId = docId;
                        aktifAlarmHalaBeklemede = beklemedeMi;
                        alarmTetikle(kod, musteri, tutar);
                    }
                }
            }

            if (aktifAlarmSiparisId != null && !aktifAlarmHalaBeklemede) {
                aktifAlarmSiparisId = null;
                alarmiSustur();
                bildirimiKaldir();
            }
        } catch (Throwable ignored) {
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void alarmTetikle(String siparisKodu, String musteriAdi, double tutar) {
        wakeLockAl();
        if (!uygulamaOnPlanda) {
            sireniCal(300);
        }
        titret();
        yuksekOncelikliBildirimGoster(siparisKodu, musteriAdi, tutar);
    }

    private synchronized void sireniCal(int maksimumSureSn) {
        try {
            alarmiSustur();
            SharedPreferences prefs = getSharedPreferences(PREFS_ADI, Context.MODE_PRIVATE);
            String seciliKimlik = prefs.getString("zil_secili_kimlik", "enerjik_siparis");
            float sesSeviyesi = Math.max(0.2f, Math.min(1.0f, prefs.getFloat("zil_ses_seviyesi", 0.9f)));

            alarmOynatici = new MediaPlayer();
            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            alarmOynatici.setAudioAttributes(attrs);

            boolean kaynakAtandi = false;
            if ("ozel_dosya".equals(seciliKimlik)) {
                java.io.File ozelDosya = new java.io.File(getFilesDir(), OZEL_ZIL_DOSYA_ADI);
                if (ozelDosya.exists() && ozelDosya.length() > 0) {
                    try {
                        alarmOynatici.setDataSource(ozelDosya.getAbsolutePath());
                        kaynakAtandi = true;
                    } catch (Throwable ignored) {
                        alarmOynatici.reset();
                        alarmOynatici.setAudioAttributes(attrs);
                    }
                }
            }

            if (!kaynakAtandi) {
                int rawResId = R.raw.nukleer_siren;
                if ("kasa_bereket".equals(seciliKimlik)) {
                    rawResId = R.raw.zil_kasa_bereket;
                } else if ("neseli_marimba".equals(seciliKimlik)) {
                    rawResId = R.raw.zil_neseli_marimba;
                } else if ("sicak_cingirak".equals(seciliKimlik)) {
                    rawResId = R.raw.zil_sicak_cingirak;
                }
                Uri sesUri = Uri.parse("android.resource://" + getPackageName() + "/" + rawResId);
                alarmOynatici.setDataSource(this, sesUri);
            }

            alarmOynatici.setLooping(true);
            alarmOynatici.setVolume(sesSeviyesi, sesSeviyesi);
            alarmOynatici.prepare();
            alarmOynatici.start();

            // Mutfak onaylayana veya reddedene kadar çalar (varsayılan maksimum güvenlik sınırı)
            if (durdurZamanlayici != null && !durdurZamanlayici.isShutdown()) {
                durdurZamanlayici.shutdownNow();
            }
            durdurZamanlayici = Executors.newSingleThreadScheduledExecutor();
            durdurZamanlayici.schedule(new Runnable() {
                @Override
                public void run() {
                    alarmiSustur();
                }
            }, Math.max(2, maksimumSureSn), TimeUnit.SECONDS);
        } catch (Throwable ignored) {
        }
    }

    private synchronized void alarmiSustur() {
        aktifAlarmSiparisId = null;
        if (alarmOynatici != null) {
            try {
                if (alarmOynatici.isPlaying()) alarmOynatici.stop();
                alarmOynatici.release();
            } catch (Throwable ignored) {
            }
            alarmOynatici = null;
        }
        wakeLockBirak();
    }

    private void titret() {
        try {
            Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator == null || !vibrator.hasVibrator()) return;
            long[] pattern = new long[]{0, 600, 200, 600, 200, 800};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                vibrator.vibrate(pattern, -1);
            }
        } catch (Throwable ignored) {
        }
    }

    private void wakeLockAl() {
        try {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AfyonMutfak::SiparisAlarmKilidi");
                    wakeLock.setReferenceCounted(false);
                }
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(180_000L);
            }
        } catch (Throwable ignored) {
        }
    }

    private void wakeLockBirak() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Throwable ignored) {
        }
    }

    private void yuksekOncelikliBildirimGoster(String siparisKodu, String musteriAdi, double tutar) {
        String tutarMetni = tutar > 0 ? (" (" + Math.round(tutar) + " ₺)") : "";
        String icerik = "#" + siparisKodu + " • " + musteriAdi + tutarMetni + " — Hemen onaylayın!";
        yuksekOncelikliBildirimGosterOzel("🚨 YENİ MUTFAK SİPARİŞİ!", icerik);
    }

    private void yuksekOncelikliBildirimGosterOzel(String baslik, String icerik) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        Intent acIntent = new Intent(this, MainActivity.class);
        acIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        acIntent.putExtra("alarm_sustur", true);
        PendingIntent acPending = PendingIntent.getActivity(
                this, 10, acIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent susturIntent = new Intent(this, SiparisDinleyiciServisi.class);
        susturIntent.setAction(ACTION_SUSTUR);
        PendingIntent susturPending = PendingIntent.getService(
                this, 11, susturIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, KANAL_ALARM_ID)
                : new Notification.Builder(this);

        builder.setSmallIcon(R.drawable.ic_stat_mutfak)
                .setContentTitle(baslik)
                .setContentText(icerik)
                .setStyle(new Notification.BigTextStyle().bigText(icerik))
                .setContentIntent(acPending)
                .setFullScreenIntent(acPending, true)
                .setAutoCancel(true)
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_ALARM)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .addAction(new Notification.Action.Builder(
                        android.graphics.drawable.Icon.createWithResource(this, R.drawable.ic_stat_mutfak),
                        "Zili Sustur",
                        susturPending).build())
                .addAction(new Notification.Action.Builder(
                        android.graphics.drawable.Icon.createWithResource(this, R.drawable.ic_stat_mutfak),
                        "Siparişi Gör",
                        acPending).build());

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            builder.setPriority(Notification.PRIORITY_MAX);
        }

        nm.notify(ALARM_BILDIRIM_ID, builder.build());
    }

    private void bildirimiKaldir() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(ALARM_BILDIRIM_ID);
        }
    }

    private Notification servisBildirimiOlustur(String mutfakAdi) {
        Intent acIntent = new Intent(this, MainActivity.class);
        acIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(
                this, 1, acIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, KANAL_SERVIS_ID)
                : new Notification.Builder(this);

        builder.setSmallIcon(R.drawable.ic_stat_mutfak)
                .setContentTitle(mutfakAdi + " • Sipariş Dinleniyor")
                .setContentText("Ekran kapalıyken bile yeni siparişlerde zil çalar")
                .setContentIntent(pending)
                .setOngoing(true);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            builder.setPriority(Notification.PRIORITY_LOW);
        }

        return builder.build();
    }

    private void kanallariOlustur() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        NotificationChannel servisKanali = new NotificationChannel(
                KANAL_SERVIS_ID,
                "Arka Plan Sipariş Dinleyici",
                NotificationManager.IMPORTANCE_LOW
        );
        servisKanali.setDescription("Mutfak açıkken siparişleri kesintisiz takip eder");
        servisKanali.setSound(null, null);
        nm.createNotificationChannel(servisKanali);

        NotificationChannel alarmKanali = new NotificationChannel(
                KANAL_ALARM_ID,
                "Yeni Sipariş Zili (Acil)",
                NotificationManager.IMPORTANCE_HIGH
        );
        alarmKanali.setDescription("Yeni sipariş geldiğinde yüksek sesli alarm çalar");
        alarmKanali.enableVibration(true);
        alarmKanali.setVibrationPattern(new long[]{0, 600, 200, 600, 200, 800});
        alarmKanali.setBypassDnd(true);
        alarmKanali.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        alarmKanali.setSound(null, null);
        nm.createNotificationChannel(alarmKanali);
    }

    private void durdurVeKapat() {
        if (zamanlayici != null) {
            zamanlayici.shutdownNow();
            zamanlayici = null;
        }
        if (durdurZamanlayici != null) {
            durdurZamanlayici.shutdownNow();
            durdurZamanlayici = null;
        }
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        alarmiSustur();
        if (zamanlayici != null) {
            zamanlayici.shutdownNow();
            zamanlayici = null;
        }
        if (durdurZamanlayici != null) {
            durdurZamanlayici.shutdownNow();
            durdurZamanlayici = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private static String docIdCikar(JSONObject doc) {
        if (doc == null) return "";
        String name = doc.optString("name", "");
        int idx = name.lastIndexOf('/');
        return idx >= 0 ? name.substring(idx + 1) : name;
    }

    private static String alanMetin(JSONObject fields, String key) {
        JSONObject obj = fields.optJSONObject(key);
        if (obj == null) return "";
        if (obj.has("stringValue")) return obj.optString("stringValue", "");
        return "";
    }

    private static double alanSayi(JSONObject fields, String key) {
        JSONObject obj = fields.optJSONObject(key);
        if (obj == null) return 0;
        if (obj.has("doubleValue")) return obj.optDouble("doubleValue", 0);
        if (obj.has("integerValue")) {
            try {
                return Double.parseDouble(obj.optString("integerValue", "0"));
            } catch (NumberFormatException ignored) {
            }
        }
        return 0;
    }
}
