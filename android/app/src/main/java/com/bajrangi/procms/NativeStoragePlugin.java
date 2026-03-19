package com.bajrangi.procms; // <-- DO NOT FORGET TO CHANGE THIS TO YOUR ACTUAL PACKAGE NAME

import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

@CapacitorPlugin(name = "NativeStorage")
public class NativeStoragePlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        String filename = call.getString("filename");
        String base64Data = call.getString("data");
        String mimeType = call.getString("mimeType");

        if (filename == null || base64Data == null || mimeType == null) {
            call.reject("Must provide filename, data, and mimeType");
            return;
        }

        // Command Android to open the "Save As" UI
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, filename);

        // Modern Capacitor automatically keeps the call alive when using startActivityForResult
        startActivityForResult(call, intent, "documentPickResult");
    }

    // This runs after the user selects a folder and clicks "Save"
    @ActivityCallback
    private void documentPickResult(PluginCall call, ActivityResult result) {
        // Safety check in case the OS killed the call
        if (call == null) {
            return;
        }

        if (result.getResultCode() == getActivity().RESULT_OK) {
            Intent data = result.getData();
            if (data != null && data.getData() != null) {
                Uri uri = data.getData();
                try {
                    // Unpack the Base64 data from JavaScript into raw binary
                    String base64Data = call.getString("data");
                    byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);

                    // Write directly to the physical storage location the user chose
                    OutputStream outputStream = getContext().getContentResolver().openOutputStream(uri);
                    if (outputStream != null) {
                        outputStream.write(decodedBytes);
                        outputStream.close();
                    }
                    // Resolving automatically releases the call from memory
                    call.resolve(); 
                } catch (Exception e) {
                    call.reject("Failed to write file: " + e.getMessage());
                }
            } else {
                call.reject("No file location selected");
            }
        } else {
            call.reject("Save cancelled by user");
        }
    }
}