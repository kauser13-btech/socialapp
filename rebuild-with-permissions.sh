#!/bin/bash

echo "🔧 Rebuilding app with camera permissions..."
echo ""

# Check which platform to rebuild
echo "Select platform to rebuild:"
echo "1) iOS"
echo "2) Android"
echo "3) Both"
read -p "Enter choice (1-3): " choice

case $choice in
  1)
    echo ""
    echo "📱 Rebuilding iOS..."
    cd ios
    echo "Cleaning build..."
    rm -rf build
    echo "Installing pods..."
    pod install
    cd ..
    echo "Running iOS app..."
    npx react-native run-ios
    ;;
  2)
    echo ""
    echo "🤖 Rebuilding Android..."
    cd android
    echo "Cleaning build..."
    ./gradlew clean
    cd ..
    echo "Running Android app..."
    npx react-native run-android
    ;;
  3)
    echo ""
    echo "📱 Rebuilding iOS..."
    cd ios
    rm -rf build
    pod install
    cd ..
    
    echo ""
    echo "🤖 Rebuilding Android..."
    cd android
    ./gradlew clean
    cd ..
    
    echo ""
    echo "✅ Both platforms cleaned and ready!"
    echo "Run 'npx react-native run-ios' or 'npx react-native run-android' to start"
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "✅ Done! App should now have camera permissions."
echo ""
echo "📝 Remember:"
echo "  - First camera access will show permission dialog"
echo "  - Grant permissions when prompted"
echo "  - Check Settings if you accidentally denied"
