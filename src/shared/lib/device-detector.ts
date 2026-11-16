export interface DevicePlatformInfo {
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android' | 'macos' | 'windows' | 'linux';
  osVersion: string;
}

export function getLocalDeviceInfo(): DevicePlatformInfo {
  let deviceId = localStorage.getItem('unibeam_device_id');
  if (!deviceId) {
    deviceId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('unibeam_device_id', deviceId);
  }

  const ua = navigator.userAgent;
  let platform: DevicePlatformInfo['platform'] = 'windows';
  let deviceName = 'PC / Web';
  let osVersion = 'Browser';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    platform = 'ios';
    deviceName = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
    osVersion = 'iOS';
  } else if (/Android/i.test(ua)) {
    platform = 'android';
    const match = ua.match(/Android\s([0-9\.]+)/);
    deviceName = 'Android Device';
    osVersion = match ? `Android ${match[1]}` : 'Android';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    platform = 'macos';
    deviceName = 'MacBook / Mac';
    osVersion = 'macOS';
  } else if (/Windows/i.test(ua)) {
    platform = 'windows';
    deviceName = 'Windows PC';
    osVersion = 'Windows';
  } else if (/Linux/i.test(ua)) {
    platform = 'linux';
    deviceName = 'Linux Workstation';
    osVersion = 'Linux';
  }

  // Attempt to read custom device name saved in localStorage
  const savedCustomName = localStorage.getItem('unibeam_custom_device_name');
  if (savedCustomName) {
    deviceName = savedCustomName;
  }

  return {
    deviceId,
    deviceName,
    platform,
    osVersion,
  };
}
