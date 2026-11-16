package com.afyonevlezzetleri.mutfak;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            SharedPreferences prefs = context.getSharedPreferences(SiparisDinleyiciServisi.PREFS_ADI, Context.MODE_PRIVATE);
            String mutfakId = prefs.getString("mutfak_id", "");
            boolean acikMi = prefs.getBoolean("mutfak_acik", true);
            if (mutfakId != null && !mutfakId.isEmpty() && acikMi) {
                Intent servisIntent = new Intent(context, SiparisDinleyiciServisi.class);
                servisIntent.setAction(SiparisDinleyiciServisi.ACTION_BASLAT);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(servisIntent);
                } else {
                    context.startService(servisIntent);
                }
            }
        }
    }
}
