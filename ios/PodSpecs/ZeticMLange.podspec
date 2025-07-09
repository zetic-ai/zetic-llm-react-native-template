#
# To learn more about a Podspec see http://guides.cocoapods.org/syntax/podspec.html.
#
Pod::Spec.new do |s|
  s.name             = 'ZeticMLange'
  s.version          = '1.2.2'
  s.summary          = 'ZeticMLange Framework'
  s.homepage         = 'https://github.com/zetic-ai/ZeticMLangeiOS'
  s.author           = { 'Zetic AI' => 'software@zetic.ai' }
  s.source           = { :http => 'https://github.com/zetic-ai/ZeticMLangeiOS/releases/download/1.2.2/ZeticMLange.xcframework.zip' }
  s.platform = :ios, '15.0'
  s.vendored_frameworks = 'ZeticMLange.xcframework'

  # Flutter.framework does not contain a i386 slice.
  s.pod_target_xcconfig = { 
    'DEFINES_MODULE' => 'YES', 
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'i386',
    'OTHER_LDFLAGS' => '-framework Accelerate -lc++',
    'ENABLE_BITCODE' => 'NO'
  }
  s.swift_version = '5.0'
  s.frameworks = 'Accelerate', 'Foundation', 'CoreML'
  s.libraries = 'c++', 'z'
end
