# Add project specific ProGuard rules here.

# ─── React Native ────────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# ─── Firebase / FCM ──────────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Keep FCM service so background messages are delivered when app is killed
-keep class io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService { *; }
-keep class io.invertase.firebase.** { *; }

# ─── Notifee ─────────────────────────────────────────────────────────────────
# Notifee uses reflection internally — keep all its classes to prevent
# the background / full-screen intent from silently failing in release builds.
-keep class app.notifee.** { *; }
-dontwarn app.notifee.**

# ─── WebRTC ──────────────────────────────────────────────────────────────────
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**

# ─── Serialization (keep data classes used in notification payloads) ─────────
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses
