package com.afyonevlezzetleri.mutfak;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {

    private static final String YEREL_HOST = "appassets.androidplatform.net";
    private static final String BASLANGIC_URL = "https://" + YEREL_HOST + "/index.html";
    private static final int DOSYA_SECIM_KODU = 4001;
    private static final int BILDIRIM_IZIN_KODU = 4002;
    private static final int BILINMEYEN_KAYNAK_IZIN_KODU = 4003;
    private static final String GUNCEL_APK_ADI = "afyon-mutfak-guncel.apk";

    private WebView webView;
    private ValueCallback<Uri[]> dosyaSecimCallback;
    private volatile boolean apkIndiriliyor = false;

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(0xFF180A1F);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings ayarlar = webView.getSettings();
        ayarlar.setJavaScriptEnabled(true);
        ayarlar.setDomStorageEnabled(true);
        ayarlar.setDatabaseEnabled(true);
        ayarlar.setMediaPlaybackRequiresUserGesture(false);
        ayarlar.setAllowFileAccess(false);
        ayarlar.setAllowContentAccess(true);
        ayarlar.setLoadWithOverviewMode(true);
        ayarlar.setUseWideViewPort(true);
        ayarlar.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.addJavascriptInterface(new AfyonMutfakKopru(), "AfyonMutfakAndroid");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri != null && YEREL_HOST.equalsIgnoreCase(uri.getHost())) {
                    String path = uri.getPath();
                    if (path == null || path.isEmpty() || "/".equals(path)) {
                        path = "/index.html";
                    }
                    String temizYol = path.startsWith("/") ? path.substring(1) : path;
                    try {
                        InputStream is = getAssets().open("www/" + temizYol);
                        return new WebResourceResponse(mimeTipiBul(temizYol), "UTF-8", is);
                    } catch (IOException e) {
                        if (!temizYol.contains(".")) {
                            try {
                                InputStream is = getAssets().open("www/index.html");
                                return new WebResourceResponse("text/html", "UTF-8", is);
                            } catch (IOException ignored) {
                            }
                        }
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri == null) return false;
                String host = uri.getHost();
                if (YEREL_HOST.equalsIgnoreCase(host)) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    return true;
                } catch (Throwable ignored) {
                    return false;
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (dosyaSecimCallback != null) {
                    dosyaSecimCallback.onReceiveValue(null);
                }
                dosyaSecimCallback = filePathCallback;
                try {
                    Intent intent = fileChooserParams.createIntent();
                    startActivityForResult(intent, DOSYA_SECIM_KODU);
                } catch (Throwable e) {
                    dosyaSecimCallback = null;
                    return false;
                }
                return true;
            }
        });

        bildirimVePilIzniIste();
        alarmSusturKontrol(getIntent());
        webView.loadUrl(BASLANGIC_URL);
    }

    @Override
    protected void onResume() {
        super.onResume();
        SiparisDinleyiciServisi.uygulamaOnPlanda = true;
        Intent sustur = new Intent(this, SiparisDinleyiciServisi.class);
        sustur.setAction(SiparisDinleyiciServisi.ACTION_SUSTUR);
        startService(sustur);
    }

    @Override
    protected void onPause() {
        SiparisDinleyiciServisi.uygulamaOnPlanda = false;
        super.onPause();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        alarmSusturKontrol(intent);
    }

    private void alarmSusturKontrol(Intent intent) {
        if (intent != null && intent.getBooleanExtra("alarm_sustur", false)) {
            Intent sustur = new Intent(this, SiparisDinleyiciServisi.class);
            sustur.setAction(SiparisDinleyiciServisi.ACTION_SUSTUR);
            startService(sustur);
        }
    }

    private void bildirimVePilIzniIste() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, BILDIRIM_IZIN_KODU);
            }
        }
        pilOptimizasyonundanCik();
    }

    @SuppressLint("BatteryLife")
    private void pilOptimizasyonundanCik() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    SharedPreferences prefs = getSharedPreferences(SiparisDinleyiciServisi.PREFS_ADI, Context.MODE_PRIVATE);
                    if (!prefs.getBoolean("pil_istendi", false)) {
                        prefs.edit().putBoolean("pil_istendi", true).apply();
                        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(Uri.parse("package:" + getPackageName()));
                        startActivity(intent);
                    }
                }
            } catch (Throwable ignored) {
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == DOSYA_SECIM_KODU && dosyaSecimCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            dosyaSecimCallback.onReceiveValue(results);
            dosyaSecimCallback = null;
        } else if (requestCode == BILINMEYEN_KAYNAK_IZIN_KODU) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && getPackageManager().canRequestPackageInstalls()) {
                File apkDosyasi = new File(getFilesDir(), GUNCEL_APK_ADI);
                if (apkDosyasi.exists()) {
                    apkKurulumuBaslat();
                }
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            moveTaskToBack(true);
        }
    }

    private static String mimeTipiBul(String yol) {
        String kucuk = yol.toLowerCase();
        if (kucuk.endsWith(".html")) return "text/html";
        if (kucuk.endsWith(".js") || kucuk.endsWith(".mjs")) return "application/javascript";
        if (kucuk.endsWith(".css")) return "text/css";
        if (kucuk.endsWith(".json")) return "application/json";
        if (kucuk.endsWith(".svg")) return "image/svg+xml";
        if (kucuk.endsWith(".png")) return "image/png";
        if (kucuk.endsWith(".jpg") || kucuk.endsWith(".jpeg")) return "image/jpeg";
        if (kucuk.endsWith(".webp")) return "image/webp";
        if (kucuk.endsWith(".mp3")) return "audio/mpeg";
        if (kucuk.endsWith(".wav")) return "audio/wav";
        if (kucuk.endsWith(".woff2")) return "font/woff2";
        if (kucuk.endsWith(".woff")) return "font/woff";
        return "application/octet-stream";
    }

    private class AfyonMutfakKopru {
        @JavascriptInterface
        public void mutfakOturumAyarla(
                String mutfakId,
                String mutfakAdi,
                boolean acikMi,
                String ekKimliklerJson,
                boolean tumMutfaklar
        ) {
            SharedPreferences prefs = getSharedPreferences(SiparisDinleyiciServisi.PREFS_ADI, Context.MODE_PRIVATE);
            prefs.edit()
                    .putString("mutfak_id", mutfakId == null ? "" : mutfakId)
                    .putString("mutfak_adi", mutfakAdi == null ? "Afyon Ev Mutfağı" : mutfakAdi)
                    .putBoolean("mutfak_acik", acikMi)
                    .putString("ek_kimlikler", ekKimliklerJson == null ? "[]" : ekKimliklerJson)
                    .putBoolean("tum_mutfaklar", tumMutfaklar)
                    .apply();

            if (mutfakId != null && !mutfakId.isEmpty() && acikMi) {
                Intent servis = new Intent(MainActivity.this, SiparisDinleyiciServisi.class);
                servis.setAction(SiparisDinleyiciServisi.ACTION_BASLAT);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(servis);
                } else {
                    startService(servis);
                }
            } else {
                Intent servis = new Intent(MainActivity.this, SiparisDinleyiciServisi.class);
                servis.setAction(SiparisDinleyiciServisi.ACTION_DURDUR);
                startService(servis);
            }
        }

        @JavascriptInterface
        public void oturumKapat() {
            SharedPreferences prefs = getSharedPreferences(SiparisDinleyiciServisi.PREFS_ADI, Context.MODE_PRIVATE);
            prefs.edit().remove("mutfak_id").putBoolean("mutfak_acik", false).apply();
            Intent servis = new Intent(MainActivity.this, SiparisDinleyiciServisi.class);
            servis.setAction(SiparisDinleyiciServisi.ACTION_DURDUR);
            startService(servis);
        }

        @JavascriptInterface
        public void zilSustur() {
            Intent sustur = new Intent(MainActivity.this, SiparisDinleyiciServisi.class);
            sustur.setAction(SiparisDinleyiciServisi.ACTION_SUSTUR);
            startService(sustur);
        }

        @JavascriptInterface
        public void zilCal(String baslik, String detay, boolean kesintisiz, int sureSn) {
            try {
                Intent cal = new Intent(MainActivity.this, SiparisDinleyiciServisi.class);
                cal.setAction(SiparisDinleyiciServisi.ACTION_ANLIK_CAL);
                cal.putExtra("baslik", baslik != null ? baslik : "🚨 YENİ MUTFAK SİPARİŞİ!");
                cal.putExtra("detay", detay != null ? detay : "Yeni sipariş geldi — Hemen onaylayın!");
                cal.putExtra("kesintisiz", kesintisiz);
                cal.putExtra("sure_sn", sureSn);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(cal);
                } else {
                    startService(cal);
                }
            } catch (Throwable ignored) {
            }
        }

        @JavascriptInterface
        public void zilAyarla(String seciliKimlik, float sesSeviyesi, String ozelSesVeriUrl) {
            try {
                float sinirliSeviye = Math.max(0.2f, Math.min(1.0f, sesSeviyesi));
                String kimlik = (seciliKimlik == null || seciliKimlik.isEmpty()) ? "enerjik_siparis" : seciliKimlik;
                SharedPreferences prefs = getSharedPreferences(SiparisDinleyiciServisi.PREFS_ADI, Context.MODE_PRIVATE);
                prefs.edit()
                        .putString("zil_secili_kimlik", kimlik)
                        .putFloat("zil_ses_seviyesi", sinirliSeviye)
                        .apply();

                File ozelDosya = new File(getFilesDir(), SiparisDinleyiciServisi.OZEL_ZIL_DOSYA_ADI);
                if ("SIL".equals(ozelSesVeriUrl)) {
                    if (ozelDosya.exists()) ozelDosya.delete();
                } else if ("ozel_dosya".equals(kimlik) && ozelSesVeriUrl != null && !ozelSesVeriUrl.isEmpty()) {
                    int virgulIdx = ozelSesVeriUrl.indexOf(',');
                    String safBase64 = virgulIdx >= 0 ? ozelSesVeriUrl.substring(virgulIdx + 1) : ozelSesVeriUrl;
                    byte[] sesBaytlari = Base64.decode(safBase64, Base64.DEFAULT);
                    if (sesBaytlari != null && sesBaytlari.length > 0) {
                        File gecici = new File(getFilesDir(), SiparisDinleyiciServisi.OZEL_ZIL_DOSYA_ADI + ".tmp");
                        FileOutputStream fos = new FileOutputStream(gecici);
                        fos.write(sesBaytlari);
                        fos.flush();
                        fos.close();
                        if (ozelDosya.exists()) ozelDosya.delete();
                        gecici.renameTo(ozelDosya);
                    }
                }
            } catch (Throwable ignored) {
            }
        }

        @JavascriptInterface
        public void pilOptimizasyonuIste() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    SharedPreferences prefs = getSharedPreferences(SiparisDinleyiciServisi.PREFS_ADI, Context.MODE_PRIVATE);
                    prefs.edit().putBoolean("pil_istendi", false).apply();
                    pilOptimizasyonundanCik();
                }
            });
        }

        @JavascriptInterface
        public String uygulamaSurumu() {
            try {
                PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
                if (info != null && info.versionName != null) {
                    return info.versionName;
                }
            } catch (Throwable ignored) {
            }
            return "1.0.0";
        }

        @JavascriptInterface
        public void apkGuncelleIndirVeKur(final String indirmeUrl) {
            if (indirmeUrl == null || indirmeUrl.isEmpty() || apkIndiriliyor) {
                return;
            }
            apkIndiriliyor = true;
            guncellemeDurumuBildir("indiriliyor", 0, "");

            new Thread(new Runnable() {
                @Override
                public void run() {
                    HttpURLConnection conn = null;
                    try {
                        String aktifUrl = indirmeUrl;
                        for (int yonlendirme = 0; yonlendirme < 6; yonlendirme++) {
                            URL url = new URL(aktifUrl);
                            conn = (HttpURLConnection) url.openConnection();
                            conn.setInstanceFollowRedirects(false);
                            conn.setConnectTimeout(15000);
                            conn.setReadTimeout(30000);
                            conn.setRequestProperty("User-Agent", "AfyonMutfak-Android/1.0");
                            int code = conn.getResponseCode();
                            if (code == HttpURLConnection.HTTP_MOVED_PERM
                                    || code == HttpURLConnection.HTTP_MOVED_TEMP
                                    || code == 307
                                    || code == 308) {
                                String yeniKonum = conn.getHeaderField("Location");
                                conn.disconnect();
                                if (yeniKonum == null || yeniKonum.isEmpty()) {
                                    throw new IOException("Geçersiz yönlendirme adresi");
                                }
                                aktifUrl = yeniKonum;
                                continue;
                            }
                            break;
                        }

                        if (conn == null || conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
                            throw new IOException("APK indirilemedi (HTTP " + (conn != null ? conn.getResponseCode() : 0) + ")");
                        }

                        long toplamBoyut = conn.getContentLengthLong();
                        File hedef = new File(getFilesDir(), GUNCEL_APK_ADI);
                        File gecici = new File(getFilesDir(), GUNCEL_APK_ADI + ".tmp");

                        InputStream in = conn.getInputStream();
                        FileOutputStream out = new FileOutputStream(gecici);
                        byte[] buf = new byte[16384];
                        long inen = 0;
                        int sonYuzde = -1;
                        int okunan;
                        while ((okunan = in.read(buf)) != -1) {
                            out.write(buf, 0, okunan);
                            inen += okunan;
                            if (toplamBoyut > 0) {
                                int yuzde = (int) ((inen * 100) / toplamBoyut);
                                if (yuzde != sonYuzde) {
                                    sonYuzde = yuzde;
                                    guncellemeDurumuBildir("indiriliyor", yuzde, "");
                                }
                            }
                        }
                        out.flush();
                        out.close();
                        in.close();

                        if (gecici.length() < 100000) {
                            gecici.delete();
                            throw new IOException("İndirilen dosya geçerli bir APK değil.");
                        }
                        if (hedef.exists()) hedef.delete();
                        gecici.renameTo(hedef);

                        guncellemeDurumuBildir("hazir", 100, "");
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                apkKurulumuBaslat();
                            }
                        });
                    } catch (Throwable e) {
                        String msg = e.getMessage() != null ? e.getMessage() : "İndirme hatası";
                        guncellemeDurumuBildir("hata", 0, msg);
                    } finally {
                        if (conn != null) conn.disconnect();
                        apkIndiriliyor = false;
                    }
                }
            }).start();
        }
    }

    private void apkKurulumuBaslat() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
                Intent izinIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                izinIntent.setData(Uri.parse("package:" + getPackageName()));
                startActivityForResult(izinIntent, BILINMEYEN_KAYNAK_IZIN_KODU);
                guncellemeDurumuBildir("izin_gerekli", 100, "Lütfen uygulama yükleme iznini açın");
                return;
            }
            Uri contentUri = Uri.parse("content://" + ApkDosyaSaglayici.AUTHORITY + "/" + GUNCEL_APK_ADI);
            Intent kurIntent = new Intent(Intent.ACTION_VIEW);
            kurIntent.setDataAndType(contentUri, "application/vnd.android.package-archive");
            kurIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(kurIntent);
        } catch (Throwable e) {
            guncellemeDurumuBildir("hata", 0, "Kurulum başlatılamadı");
        }
    }

    private void guncellemeDurumuBildir(final String durum, final int yuzde, final String hata) {
        final String temizHata = hata == null ? "" : hata.replace("\\", "\\\\").replace("'", "\\'");
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (webView != null) {
                    String js = "window.dispatchEvent(new CustomEvent('afyon_apk_indirme',{detail:{durum:'"
                            + durum + "',yuzde:" + yuzde + ",hata:'" + temizHata + "'}}));";
                    webView.evaluateJavascript(js, null);
                }
            }
        });
    }
}
