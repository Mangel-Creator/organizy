// Configuración nativa de las alarmas de verdad (fase 7), en lugar del plugin que trae
// react-native-alarm-scheduler (1.0.1). El suyo falla al preparar Android: pasa
// `modResults.manifest` a `addPermission`, que espera `modResults`, y la app de Android
// no se podía construir ("Cannot read properties of undefined (reading 'uses-permission')").
// Este hace lo mismo, bien. Si una versión nueva de la librería lo arregla, se puede
// volver a poner "react-native-alarm-scheduler" en app.json y borrar este archivo.
//
//   - Android: permiso de alarmas exactas, de avisos y SET_ALARM (el resto de permisos,
//     el servicio que suena y la pantalla completa ya vienen en el manifiesto de la
//     librería).
//   - iPhone: la frase del permiso de AlarmKit y el sonido silencioso de la librería
//     (para "Solo vibrar").

const path = require('path');
const {
  AndroidConfig,
  IOSConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withInfoPlist,
  withXcodeProject,
} = require('expo/config-plugins');

const SONIDO_SILENCIO = path.join(
  path.dirname(require.resolve('react-native-alarm-scheduler/package.json')),
  'assets',
  'alarm-scheduler-silence.caf',
);

function conAlarmas(config, { alarmKitUsageDescription } = {}) {
  config = withAndroidManifest(config, (mod) => {
    AndroidConfig.Permissions.ensurePermissions(mod.modResults, [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.POST_NOTIFICATIONS',
      'com.android.alarm.permission.SET_ALARM',
    ]);
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    mod.modResults.NSAlarmKitUsageDescription =
      alarmKitUsageDescription || 'Organizy usa alarmas para despertarte y avisarte de cuándo salir.';
    mod.modResults.NSSupportsLiveActivities = true;
    return mod;
  });

  config = withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    IOSConfig.XcodeUtils.ensureGroupRecursively(project, 'Resources');
    IOSConfig.XcodeUtils.addResourceFileToGroup({
      filepath: path.relative(mod.modRequest.platformProjectRoot, SONIDO_SILENCIO),
      groupName: 'Resources',
      project,
      isBuildFile: true,
      verbose: true,
    });
    return mod;
  });

  return config;
}

module.exports = createRunOncePlugin(conAlarmas, 'organizy-alarmas', '1.0.0');
