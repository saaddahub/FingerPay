import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

// Endpoints come from android/local.properties (never committed). Debug defaults reach the PC's local stack
// from the emulator (10.0.2.2 is the host machine). The anon key is a public key by design.
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun prop(name: String, fallback: String) = (providers.gradleProperty(name).orNull ?: localProps.getProperty(name) ?: fallback).replace("\"", "")

android {
    namespace = "pk.fingerpay.terminal"
    compileSdk = 36

    defaultConfig {
        applicationId = "pk.fingerpay.terminal"
        minSdk = 28
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "API_BASE_URL", "\"${prop("fp.apiBaseUrl", "http://10.0.2.2:3000")}\"")
        buildConfigField("String", "SUPABASE_URL", "\"${prop("fp.supabaseUrl", "http://10.0.2.2:54321")}\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"${prop("fp.supabaseAnonKey", "")}\"")
    }

    flavorDimensions += "audience"
    productFlavors {
        create("merchant") {
            dimension = "audience"
            buildConfigField("String", "ACCOUNT_TYPE", "\"merchant\"")
            resValue("string", "app_name", "FingerPay Merchant")
        }
        create("customer") {
            dimension = "audience"
            applicationId = "pk.fingerpay.customer"
            buildConfigField("String", "ACCOUNT_TYPE", "\"customer\"")
            resValue("string", "app_name", "FingerPay Customer")
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            manifestPlaceholders["networkConfig"] = "@xml/network_security_debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            manifestPlaceholders["networkConfig"] = "@xml/network_security_release"
            // Signed with the debug key for side-loading the student prototype; a real release key comes later.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin {
        jvmToolchain(21)
        compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.process)
    implementation(libs.androidx.biometric)
    implementation(libs.androidx.datastore)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.okhttp)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)
    debugImplementation(libs.compose.ui.tooling)
    testImplementation(libs.junit)
}
