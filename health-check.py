#!/usr/bin/env python3
"""
Health check for ToolsForge PDF Editor
Verifies all systems are operational
"""

import requests
import sys
import json
from datetime import datetime

def check_health(base_url="http://localhost:3000"):
    """Check application health"""
    print("=" * 60)
    print("TOOLSFORGE PDF EDITOR - HEALTH CHECK")
    print("=" * 60)
    
    checks_passed = 0
    checks_total = 0
    
    # Check 1: Application is running
    print(f"\n[CHECK] Application is running...")
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200:
            print("[OK] Application is responding")
            checks_passed += 1
        else:
            print(f"[WARN] Application returned status {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Cannot reach application: {e}")
    checks_total += 1
    
    # Check 2: API endpoint is accessible
    print(f"\n[CHECK] API endpoint is accessible...")
    try:
        response = requests.options(f"{base_url}/api/pdf/edit", timeout=5)
        if response.status_code in [200, 204]:
            print("[OK] API endpoint is accessible")
            checks_passed += 1
        else:
            print(f"[WARN] API returned status {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Cannot reach API: {e}")
    checks_total += 1
    
    # Check 3: PDF editor page loads
    print(f"\n[CHECK] PDF editor page loads...")
    try:
        response = requests.get(f"{base_url}/tools/pdf-editor", timeout=5)
        if response.status_code == 200:
            print("[OK] PDF editor page loads successfully")
            checks_passed += 1
        else:
            print(f"[WARN] Page returned status {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Cannot load editor page: {e}")
    checks_total += 1
    
    # Summary
    print(f"\n{'=' * 60}")
    print(f"HEALTH CHECK SUMMARY")
    print(f"{'=' * 60}")
    print(f"Passed: {checks_passed}/{checks_total}")
    print(f"Status: {'HEALTHY' if checks_passed == checks_total else 'ISSUES DETECTED'}")
    
    return checks_passed == checks_total

if __name__ == "__main__":
    try:
        healthy = check_health()
        sys.exit(0 if healthy else 1)
    except Exception as e:
        print(f"Health check failed: {e}")
        sys.exit(1)
