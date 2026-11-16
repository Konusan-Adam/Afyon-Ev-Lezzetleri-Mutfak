package com.afyonevlezzetleri.mutfak;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

public class ApkDosyaSaglayici extends ContentProvider {

    public static final String AUTHORITY = "com.afyonevlezzetleri.mutfak.apkprovider";

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public String getType(Uri uri) {
        return "application/vnd.android.package-archive";
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (getContext() == null) {
            throw new FileNotFoundException("Context bulunamadı");
        }
        String dosyaAdi = uri.getLastPathSegment();
        if (dosyaAdi == null || dosyaAdi.isEmpty() || dosyaAdi.contains("..")) {
            throw new FileNotFoundException("Geçersiz dosya");
        }
        File dosya = new File(getContext().getFilesDir(), dosyaAdi);
        if (!dosya.exists()) {
            throw new FileNotFoundException("APK dosyası bulunamadı: " + dosya.getAbsolutePath());
        }
        return ParcelFileDescriptor.open(dosya, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        if (getContext() == null) return null;
        String dosyaAdi = uri.getLastPathSegment();
        File dosya = dosyaAdi != null ? new File(getContext().getFilesDir(), dosyaAdi) : null;
        String[] cols = projection != null ? projection : new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE};
        MatrixCursor cursor = new MatrixCursor(cols);
        Object[] row = new Object[cols.length];
        for (int i = 0; i < cols.length; i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(cols[i])) {
                row[i] = dosyaAdi != null ? dosyaAdi : "afyon-mutfak.apk";
            } else if (OpenableColumns.SIZE.equals(cols[i])) {
                row[i] = (dosya != null && dosya.exists()) ? dosya.length() : 0L;
            }
        }
        cursor.addRow(row);
        return cursor;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
