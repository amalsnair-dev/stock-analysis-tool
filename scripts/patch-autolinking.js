const fs = require('fs');
const path = require('path');

const osKtPath = path.join(
  __dirname,
  '../node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin-shared/src/main/kotlin/expo/modules/plugin/Os.kt'
);

const commandBuilderPath = path.join(
  __dirname,
  '../node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin-shared/src/main/kotlin/expo/modules/plugin/AutolinkingCommandBuilder.kt'
);

const settingsPluginPath = path.join(
  __dirname,
  '../node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingSettingsPlugin.kt'
);

const settingsExtensionPath = path.join(
  __dirname,
  '../node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingSettingsExtension.kt'
);

const autolinkingPluginPath = path.join(
  __dirname,
  '../node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingPlugin.kt'
);

const mavenPubPath = path.join(
  __dirname,
  '../node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/android/MavenPublicationExtension.kt'
);

const expoConstantsScriptPath = path.join(
  __dirname,
  '../node_modules/expo-constants/scripts/get-app-config-android.gradle'
);

const expoGradleHelperPath = path.join(
  __dirname,
  '../node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/gradle/ExpoGradleHelperExtension.kt'
);

try {
  if (fs.existsSync(osKtPath)) {
    let content = fs.readFileSync(osKtPath, 'utf8');
    if (!content.includes('nodeExecutable')) {
      content = `package expo.modules.plugin

import java.io.File

object Os {
  val nodeExecutable: String by lazy {
    val candidates = listOf(
      "/opt/homebrew/bin/node",
      "/usr/local/bin/node",
      System.getProperty("user.home") + "/.nvm/versions/node/v24.22.0/bin/node"
    )
    candidates.firstOrNull { File(it).canExecute() } ?: "node"
  }

  fun isWindows(): Boolean =
    System.getProperty("os.name")?.lowercase()?.contains("windows") == true

  fun windowsAwareCommandLine(args: List<String>): List<String> =
    if (isWindows()) {
      listOf("cmd", "/c") + args
    } else {
      args
    }
}
`;
      fs.writeFileSync(osKtPath, content, 'utf8');
    }
  }

  if (fs.existsSync(commandBuilderPath)) {
    let content = fs.readFileSync(commandBuilderPath, 'utf8');
    if (content.includes('"node",') && !content.includes('Os.nodeExecutable,')) {
      content = content.replace('"node",', 'Os.nodeExecutable,');
      fs.writeFileSync(commandBuilderPath, content, 'utf8');
    }
  }

  if (fs.existsSync(settingsPluginPath)) {
    let content = fs.readFileSync(settingsPluginPath, 'utf8');
    if (content.includes('env.commandLine("node",')) {
      content = content.replace('env.commandLine("node",', 'env.commandLine(Os.nodeExecutable,');
      fs.writeFileSync(settingsPluginPath, content, 'utf8');
    }
  }

  if (fs.existsSync(settingsExtensionPath)) {
    let content = fs.readFileSync(settingsExtensionPath, 'utf8');
    if (content.includes('env.commandLine("node",')) {
      content = content.replaceAll('env.commandLine("node",', 'env.commandLine(Os.nodeExecutable,');
      fs.writeFileSync(settingsExtensionPath, content, 'utf8');
    }
  }

  if (fs.existsSync(autolinkingPluginPath)) {
    let content = fs.readFileSync(autolinkingPluginPath, 'utf8');
    if (content.includes('spec.commandLine(\n            "node",')) {
      content = content.replace('spec.commandLine(\n            "node",', 'spec.commandLine(\n            Os.nodeExecutable,');
      fs.writeFileSync(autolinkingPluginPath, content, 'utf8');
    }
  }

  if (fs.existsSync(mavenPubPath)) {
    let content = fs.readFileSync(mavenPubPath, 'utf8');
    if (content.includes('components = project.components.getByName("release")')) {
      content = content.replace(
        `internal data class PublicationInfo(
  val components: SoftwareComponent,
  val groupId: String,
  val artifactId: String,
  val version: String,
) {
  constructor(
    project: Project,
  ) : this(
    components = project.components.getByName("release"),`,
        `internal data class PublicationInfo(
  private val projectRef: Project,
  val groupId: String,
  val artifactId: String,
  val version: String,
) {
  val components: SoftwareComponent
    get() = projectRef.components.findByName("release") ?: projectRef.components.getByName("release")

  constructor(
    project: Project,
  ) : this(
    projectRef = project,`
      );
      fs.writeFileSync(mavenPubPath, content, 'utf8');
    }
  }

  if (fs.existsSync(expoConstantsScriptPath)) {
    let content = fs.readFileSync(expoConstantsScriptPath, 'utf8');
    if (!content.includes('findExpoNode')) {
      const helper = `def findExpoNode = {
  def candidates = ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"]
  for (c in candidates) {
    if (new File(c).canExecute()) return c
  }
  return "node"
}
def expoNodeBin = findExpoNode()
`;
      content = helper + content.replace(
        'commandLine("node",',
        'commandLine(expoNodeBin,'
      );
      fs.writeFileSync(expoConstantsScriptPath, content, 'utf8');
    }
  }

  if (fs.existsSync(expoGradleHelperPath)) {
    let content = fs.readFileSync(expoGradleHelperPath, 'utf8');
    if (content.includes('env.commandLine("node",')) {
      content = content.replace(
        'env.commandLine("node",',
        'val nodeBin = listOf("/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node").firstOrNull { File(it).canExecute() } ?: "node"\n        env.commandLine(nodeBin,'
      );
      fs.writeFileSync(expoGradleHelperPath, content, 'utf8');
    }
  }
} catch (e) {
  console.warn('patch-autolinking warning:', e.message);
}
