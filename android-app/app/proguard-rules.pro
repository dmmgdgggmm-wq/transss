# Keep WebView JS bridge methods
-keepclassmembers class com.example.rpgmtranslator.MainActivity$AndroidFileBridge {
    @android.webkit.JavascriptInterface <methods>;
}
