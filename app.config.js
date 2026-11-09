const base = require('./app.json').expo

const reverseClientId = id =>
  id
    ? `com.googleusercontent.apps.${id.replace(
        '.apps.googleusercontent.com',
        ''
      )}`
    : null

// Google's native OAuth redirect is `<reversed client id>:/oauthredirect`, so the scheme must be registered.
const googleSchemes = [
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
]
  .map(reverseClientId)
  .filter(Boolean)

module.exports = {
  expo: {
    ...base,
    scheme: [base.scheme, ...googleSchemes],
    ios: { ...base.ios, bundleIdentifier: 'com.ijse.timeflow' },
    android: { ...base.android, package: 'com.ijse.timeflow' },
    extra: {
      eas: {
        projectId: '904db6f2-0ad2-49ab-bcca-79a9e2fac94a'
      }
    }
  }
}
