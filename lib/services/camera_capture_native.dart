import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../l10n/app_language.dart';

Future<Uint8List?> captureCamera(BuildContext context) async {
  try {
    final file = await ImagePicker().pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: CameraDevice.front,
      maxWidth: 800,
      maxHeight: 800,
      imageQuality: 75,
    );
    if (file == null) return null;
    final bytes = await file.readAsBytes();
    if (bytes.length > 500000) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: AppText('Choose a smaller photo (up to 500 KB).'),
          ),
        );
      }
      return null;
    }
    return bytes;
  } on PlatformException {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: AppText('Camera is unavailable. Use Upload photo instead.'),
        ),
      );
    }
    return null;
  }
}
