import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import PushKit


@main
class AppDelegate: UIResponder, UIApplicationDelegate, PKPushRegistryDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "app",
      in: window,
      launchOptions: launchOptions
    )

    // VoIP Push Notification Setup
    let voipRegistry = PKPushRegistry(queue: DispatchQueue.main)
    voipRegistry.delegate = self
    voipRegistry.desiredPushTypes = [.voIP]

    return true
  }

  // MARK: - PKPushRegistryDelegate

  func pushRegistry(_ registry: PKPushRegistry, didUpdate credentials: PKPushCredentials, for type: PKPushType) {
    if type == .voIP {
      // Notify JS that token is ready
      // The Objective-C method signature is: + (void)didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(NSString *)type;
      RNVoipPushNotificationManager.didUpdate(credentials, forType: "voip")
      
      let token = credentials.token
      // Post notification for RNVoipPushNotification to pick up (legacy behavior)
      NotificationCenter.default.post(name: NSNotification.Name("RNVoipPushNotificationDidRegisterForRemoteNotificationsWithDeviceToken"), object: token)
    }
  }

  func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    if type == .voIP {
      let payloadDict = payload.dictionaryPayload as? [String: Any]

      // CRITICAL: On iOS 13+, you MUST report a call to CallKit synchronously
      // inside this delegate method. If you don't, iOS will terminate the app.
      // We report the call here in native code BEFORE forwarding to JS.
      let uuid = (payloadDict?["uuid"] as? String) ?? UUID().uuidString
      let callerName = (payloadDict?["callerName"] as? String) ?? "Unomi User"
      let handle = (payloadDict?["handle"] as? String) ?? "Unomi"

      RNCallKeep.reportNewIncomingCall(uuid, handle: handle, handleType: "generic", hasVideo: true, localizedCallerName: callerName, supportsHolding: false, supportsDTMF: false, supportsGrouping: false, supportsUngrouping: false, fromPushKit: true, payload: payloadDict, withCompletionHandler: nil)

      // Now forward to JS for further processing
      RNVoipPushNotificationManager.didReceiveIncomingPush(with: payload, forType: "voip")

      // Register completion handler so JS can call onVoipNotificationCompleted
      if let uuidFromPayload = payloadDict?["uuid"] as? String {
        RNVoipPushNotificationManager.addCompletionHandler(uuidFromPayload, completionHandler: completion)
      } else {
        completion()
      }
    }
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
