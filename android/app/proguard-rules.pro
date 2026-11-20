# kotlinx.serialization keeps its generated serializers
-keepattributes *Annotation*, InnerClasses
-keepclassmembers class pk.fingerpay.terminal.data.** {
    *** Companion;
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class pk.fingerpay.terminal.data.**$$serializer { *; }
