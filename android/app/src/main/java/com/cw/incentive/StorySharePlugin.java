package com.cw.incentive;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "StoryShare")
public class StorySharePlugin extends Plugin {
    private Bitmap decode(String base64) throws Exception {
        byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
        Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (bitmap == null) throw new IllegalArgumentException("Invalid PNG image");
        return bitmap;
    }

    private Uri saveToGallery(Bitmap bitmap, String filename) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/TBS Incentive");
            values.put(MediaStore.Images.Media.IS_PENDING, 1);
        }
        Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (uri == null) throw new IllegalStateException("Unable to create gallery item");
        try (OutputStream output = resolver.openOutputStream(uri)) {
            if (output == null || !bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) {
                throw new IllegalStateException("Unable to write gallery image");
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues publish = new ContentValues();
            publish.put(MediaStore.Images.Media.IS_PENDING, 0);
            resolver.update(uri, publish, null, null);
        }
        return uri;
    }

    @PluginMethod
    public void saveImage(PluginCall call) {
        try {
            Bitmap bitmap = decode(call.getString("base64", ""));
            String filename = call.getString("filename", "TBS-Incentive-Story.png");
            Uri uri = saveToGallery(bitmap, filename);
            JSObject result = new JSObject();
            result.put("ok", true);
            result.put("uri", uri.toString());
            call.resolve(result);
            bitmap.recycle();
        } catch (Exception error) {
            call.reject("Unable to save Story image", error);
        }
    }

    @PluginMethod
    public void shareImage(PluginCall call) {
        try {
            Bitmap bitmap = decode(call.getString("base64", ""));
            String filename = call.getString("filename", "TBS-Incentive-Story.png");
            Uri uri = saveToGallery(bitmap, filename);
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("image/png");
            intent.putExtra(Intent.EXTRA_STREAM, uri);
            intent.putExtra(Intent.EXTRA_TEXT, call.getString("text", "TBS Incentive"));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(intent, "แชร์ Story TBS Incentive");
            getActivity().startActivity(chooser);
            JSObject result = new JSObject();
            result.put("ok", true);
            result.put("uri", uri.toString());
            call.resolve(result);
            bitmap.recycle();
        } catch (Exception error) {
            call.reject("Unable to share Story image", error);
        }
    }
}
