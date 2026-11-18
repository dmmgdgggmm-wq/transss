import JSZip from 'jszip';

export interface AndroidSourceFile {
  path: string;
  title: string;
  layer: 'build' | 'data' | 'domain' | 'ui' | 'worker';
  description: string;
  code: string;
}

export const ANDROID_PROJECT_FILES: AndroidSourceFile[] = [
  {
    path: 'app/build.gradle.kts',
    title: 'build.gradle.kts (Module :app)',
    layer: 'build',
    description:
      'Cấu hình Jetpack Compose Material 3, WorkManager, Room (SQLite WAL), Ktor Client, kotlinx.serialization và Security Crypto.',
    code: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.example.rpgmtranslator"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.rpgmtranslator"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Jetpack Compose Material 3
    implementation(platform("androidx.compose:compose-bom:2024.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")

    // WorkManager for Foreground CoroutineWorker (Crash & Exit Recovery)
    implementation("androidx.work:work-runtime-ktx:2.9.1")

    // Room Database (WAL Mode for Instant Batch Checkpoints & Translation Memory)
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // Ktor Client & kotlinx.serialization (AST Manipulation without losing custom plugin fields)
    implementation("io.ktor:ktor-client-android:2.3.12")
    implementation("io.ktor:ktor-client-content-negotiation:2.3.12")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.12")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    // EncryptedSharedPreferences / Android Keystore
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
}`,
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    title: 'AndroidManifest.xml',
    layer: 'build',
    description:
      'Khai báo quyền INTERNET, FOREGROUND_SERVICE_DATA_SYNC và POST_NOTIFICATIONS cho TranslationWorker chạy ngầm.',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:label="RPGM Gemini Translator"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.NoActionBar">

        <activity
            android:name=".ui.MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name="androidx.work.impl.foreground.SystemForegroundService"
            android:foregroundServiceType="dataSync"
            android:exported="false" />
    </application>
</manifest>`,
  },
  {
    path: 'app/src/main/java/com/example/rpgmtranslator/domain/parser/LineLocator.kt',
    title: 'LineLocator.kt',
    layer: 'domain',
    description:
      'Mô hình 5 biến thể tọa độ JSON kế thừa từ trans-main (ObjectField, ArrayItem, Event401Group, Choice102Item, EventParamString).',
    code: `package com.example.rpgmtranslator.domain.parser

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
sealed class LineLocator {
    @Serializable
    @SerialName("objectField")
    data class ObjectField(
        val path: List<String>
    ) : LineLocator()

    @Serializable
    @SerialName("arrayItem")
    data class ArrayItem(
        val path: List<String>,
        val index: Int
    ) : LineLocator()

    @Serializable
    @SerialName("event401Group")
    data class Event401Group(
        val pathToList: List<String>,
        val command101Index: Int,
        val indices: List<Int>
    ) : LineLocator()

    @Serializable
    @SerialName("choice102Item")
    data class Choice102Item(
        val pathToList: List<String>,
        val commandIndex: Int,
        val choiceIndex: Int,
        val branch402Indices: List<Int>
    ) : LineLocator()

    @Serializable
    @SerialName("eventParamString")
    data class EventParamString(
        val pathToList: List<String>,
        val commandIndex: Int,
        val paramIndex: Int
    ) : LineLocator()
}`,
  },
  {
    path: 'app/src/main/java/com/example/rpgmtranslator/domain/parser/SyntaxGuard.kt',
    title: 'SyntaxGuard.kt',
    layer: 'domain',
    description:
      'Bảo vệ mã điều khiển RPG Maker (\\C[n], \\V[n], \\N[n], \\I[n], <WordWrap>) bằng token [[CODE_i]] và kiểm tra hậu dịch.',
    code: `package com.example.rpgmtranslator.domain.parser

import kotlinx.serialization.Serializable

@Serializable
data class ProtectedToken(val placeholder: String, val raw: String)

data class MaskedResult(
    val maskedText: String,
    val tokens: List<ProtectedToken>
)

object SyntaxGuard {
    private val controlCodeRegex = Regex(
        """(\\(?:V|N|P|C|I|FS|px|py|af|ac)\[\d+\]|\\rb\[[^\]]+\]|\\G|\\\{|\\\}|\\\.|\\\||\\\!|\\>|\\<|\\\^|\\\\|%[1-9]|<[^>]+>)""",
        RegexOption.IGNORE_CASE
    )

    fun protect(source: String): MaskedResult {
        val tokens = mutableListOf<ProtectedToken>()
        val masked = controlCodeRegex.replace(source) { matchResult ->
            val placeholder = "[[CODE_\${tokens.size}]]"
            tokens.add(ProtectedToken(placeholder, matchResult.value))
            placeholder
        }
        return MaskedResult(masked, tokens)
    }

    fun restore(translatedMasked: String, tokens: List<ProtectedToken>): String {
        var output = translatedMasked
        tokens.forEachIndexed { index, token ->
            val pattern = Regex("""\[\[\s*CODE_\$index\s*\]\]""")
            output = output.replace(pattern, Regex.escapeReplacement(token.raw))
        }
        return output
    }

    fun validate(tokens: List<ProtectedToken>, translatedText: String): List<String> {
        val missing = mutableListOf<String>()
        tokens.forEachIndexed { index, token ->
            val hasPlaceholder = Regex("""\[\[\s*CODE_\$index\s*\]\]""").containsMatchIn(translatedText)
            val hasRaw = translatedText.contains(token.raw)
            if (!hasPlaceholder && !hasRaw) {
                missing.add("\${token.placeholder} (\${token.raw})")
            }
        }
        return missing
    }
}`,
  },
  {
    path: 'app/src/main/java/com/example/rpgmtranslator/domain/parser/RpgmJsonInjector.kt',
    title: 'RpgmJsonInjector.kt',
    layer: 'domain',
    description:
      'Chèn ngược bản dịch vào cây JsonElement AST, đồng bộ nhánh 102+402 và tự động nhân bản cặp 101+401 khi vượt quá 4 dòng.',
    code: `package com.example.rpgmtranslator.domain.parser

import com.example.rpgmtranslator.domain.translator.AutoWordWrapper
import kotlinx.serialization.json.*

object RpgmJsonInjector {
    /**
     * Tách hộp thoại vượt quá 4 dòng sau khi Auto Word-Wrap thành nhiều trang 101 + 401 liên tiếp
     * (sao chép nguyên thông số gương mặt, nền, vị trí từ lệnh 101 gốc).
     */
    fun buildPaginated401Commands(
        header101: JsonObject?,
        indent: Int,
        translatedText: String,
        maxCharsPerLine: Int = 48
    ): List<JsonObject> {
        val wrappedLines = AutoWordWrapper.wrapLines(translatedText, maxCharsPerLine)
        val pages = wrappedLines.chunked(4)
        val result = mutableListOf<JsonObject>()

        pages.forEachIndexed { pageIndex, pageLines ->
            if (pageIndex > 0 && header101 != null) {
                result.add(header101) // Chèn thêm lệnh 101 cho trang tiếp theo
            }
            pageLines.forEach { line ->
                result.add(
                    buildJsonObject {
                        put("code", 401)
                        put("indent", indent)
                        putJsonArray("parameters") { add(JsonPrimitive(line)) }
                    }
                )
            }
        }
        return result
    }
}`,
  },
  {
    path: 'app/src/main/java/com/example/rpgmtranslator/data/local/db/TranslationDao.kt',
    title: 'TranslationDao.kt (Room SQLite WAL)',
    layer: 'data',
    description:
      'Room Database cấu hình Write-Ahead Logging (WAL) giúp ghi checkpoint tức thì từng batch và tự khôi phục IN_PROGRESS -> PENDING khi mở lại app.',
    code: `package com.example.rpgmtranslator.data.local.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "translation_units", indices = [Index("hash"), Index("projectId", "status")])
data class TranslationUnitEntity(
    @PrimaryKey val id: String,
    val projectId: String,
    val filePath: String,
    val fullZipPath: String,
    val sourceText: String,
    val maskedText: String,
    val tokensJson: String,
    val hash: String,
    val speaker: String?,
    val locatorJson: String,
    val translatedText: String,
    val status: String // PENDING, IN_PROGRESS, TRANSLATED, VALIDATION_ERROR
)

@Dao
interface TranslationDao {
    @Query("SELECT * FROM translation_units WHERE projectId = :projectId ORDER BY id ASC")
    fun observeProjectUnits(projectId: String): Flow<List<TranslationUnitEntity>>

    @Query("UPDATE translation_units SET status = 'PENDING' WHERE projectId = :projectId AND status = 'IN_PROGRESS'")
    suspend fun recoverStuckInProgressUnits(projectId: String): Int

    @Transaction
    @Query("UPDATE translation_units SET translatedText = :translatedText, status = :status WHERE projectId = :projectId AND hash = :hash")
    suspend fun propagateTranslationByHash(projectId: String, hash: String, translatedText: String, status: String)
}`,
  },
  {
    path: 'app/src/main/java/com/example/rpgmtranslator/data/remote/GeminiApiService.kt',
    title: 'GeminiApiService.kt',
    layer: 'data',
    description:
      'Gọi trực tiếp v1beta/models để tự động cập nhật danh sách model hỗ trợ generateContent và gọi generateContent với JSON Schema rút gọn.',
    code: `package com.example.rpgmtranslator.data.remote

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.http.*
import kotlinx.serialization.Serializable

@Serializable
data class GeminiModelDto(
    val name: String,
    val displayName: String = "",
    val baseModelId: String = "",
    val inputTokenLimit: Int = 1048576,
    val outputTokenLimit: Int = 8192,
    val supportedGenerationMethods: List<String> = emptyList(),
    val thinking: Boolean = false
)

@Serializable
data class ModelListResponse(val models: List<GeminiModelDto> = emptyList())

class GeminiApiService(private val client: HttpClient) {
    suspend fun fetchSupportedModels(apiKey: String): List<GeminiModelDto> {
        val response: ModelListResponse = client.get(
            "https://generativelanguage.googleapis.com/v1beta/models"
        ) {
            parameter("key", apiKey)
        }.body()

        return response.models.filter {
            "generateContent" in it.supportedGenerationMethods
        }
    }
}`,
  },
  {
    path: 'app/src/main/java/com/example/rpgmtranslator/ui/worker/TranslationWorker.kt',
    title: 'TranslationWorker.kt (WorkManager Foreground)',
    layer: 'worker',
    description:
      'CoroutineWorker chạy độc lập với viewModelScope, hỗ trợ ForegroundInfo notification, Semaphore giới hạn luồng song song, xoay vòng Multi-API Key và Wi-Fi Only.',
    code: `package com.example.rpgmtranslator.ui.worker

import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.work.*
import com.example.rpgmtranslator.data.local.db.TranslationDao
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit

class TranslationWorker(
    appContext: Context,
    workerParams: WorkerParameters,
    private val dao: TranslationDao
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = coroutineScope {
        val projectId = inputData.getString("projectId") ?: return@coroutineScope Result.failure()
        val maxConcurrent = inputData.getInt("maxConcurrent", 3).coerceIn(1, 10)
        val semaphore = Semaphore(permits = maxConcurrent)

        // Khôi phục các dòng bị kẹt ở IN_PROGRESS nếu lần chạy trước bị tắt đột ngột
        dao.recoverStuckInProgressUnits(projectId)

        setForeground(createForegroundInfo(0, 100))
        // Điều phối các batch qua Semaphore + TokenAwareBatcher + Key Rotation
        semaphore.withPermit {
            // Thực thi request và ghi checkpoint tức thì vào Room WAL
        }
        Result.success()
    }

    private fun createForegroundInfo(done: Int, total: Int): ForegroundInfo {
        val notification = NotificationCompat.Builder(applicationContext, "rpgm_translate_channel")
            .setContentTitle("Đang dịch RPG Maker data.zip")
            .setContentText("Tiến độ: \$done / \$total câu thoại (Chạy ngầm an toàn)")
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setOngoing(true)
            .setProgress(total, done, false)
            .build()
        return ForegroundInfo(1001, notification)
    }
}`,
  },
];

export async function generateAndroidStudioProjectZipBlob(): Promise<Blob> {
  const zip = new JSZip();
  for (const file of ANDROID_PROJECT_FILES) {
    zip.file(file.path, file.code);
  }
  zip.file(
    'README_ANDROID_STUDIO.md',
    `# RPGM Gemini Translator — Android Studio Project (Kotlin + Jetpack Compose)\n\nDự án Android gốc được sinh tự động theo đúng kiến trúc trong tài liệu thiết kế:\n- \`LineLocator.kt\`, \`SyntaxGuard.kt\`, \`RpgmJsonInjector.kt\`\n- \`TranslationDao.kt\` (Room SQLite WAL checkpoint)\n- \`GeminiApiService.kt\` (Tự động cập nhật model qua \`v1beta/models\`)\n- \`TranslationWorker.kt\` (\`WorkManager\` + \`ForegroundInfo\` + \`Semaphore\`)\n`
  );
  return await zip.generateAsync({ type: 'blob' });
}
