#!/usr/bin/env python3
"""
Production Monitoring Dashboard
Real-time monitoring for ToolsForge PDF Editor
Shows performance metrics, errors, and system health
"""

import requests
import json
import time
import os
from datetime import datetime
from collections import deque
from typing import Dict, List, Optional


class MonitoringDashboard:
    """Main monitoring dashboard class"""
    
    def __init__(self, app_url: str = "http://localhost:3000", check_interval: int = 30):
        self.app_url = app_url
        self.check_interval = check_interval
        self.metrics = {
            'uptime_percentage': 100.0,
            'response_times': deque(maxlen=100),
            'errors': deque(maxlen=50),
            'last_check': None,
            'total_requests': 0,
            'failed_requests': 0,
            'average_response_time': 0.0
        }
        self.start_time = datetime.now()
        
    def check_endpoint(self, endpoint: str, method: str = "GET") -> Dict:
        """Check a specific endpoint"""
        try:
            start = time.time()
            
            if method == "GET":
                response = requests.get(f"{self.app_url}{endpoint}", timeout=5)
            elif method == "OPTIONS":
                response = requests.options(f"{self.app_url}{endpoint}", timeout=5)
            else:
                return {'status': 'error', 'message': 'Unknown method'}
            
            elapsed = (time.time() - start) * 1000  # Convert to ms
            
            return {
                'endpoint': endpoint,
                'status': 'success' if response.status_code < 400 else 'error',
                'code': response.status_code,
                'response_time_ms': elapsed,
                'timestamp': datetime.now().isoformat()
            }
        except requests.Timeout:
            return {
                'endpoint': endpoint,
                'status': 'timeout',
                'code': None,
                'response_time_ms': 5000,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'endpoint': endpoint,
                'status': 'error',
                'code': None,
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def run_health_check(self) -> Dict:
        """Run comprehensive health check"""
        endpoints = [
            ('/', 'GET'),
            ('/tools/pdf-editor', 'GET'),
            ('/api/pdf/edit', 'OPTIONS'),
            ('/api/ai/generate', 'OPTIONS'),
        ]
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'checks': [],
            'summary': None
        }
        
        successful = 0
        total_time = 0
        
        print("\n" + "=" * 70)
        print("HEALTH CHECK IN PROGRESS")
        print("=" * 70)
        
        for endpoint, method in endpoints:
            result = self.check_endpoint(endpoint, method)
            results['checks'].append(result)
            
            status_symbol = "✓" if result['status'] == 'success' else "✗"
            print(f"{status_symbol} {endpoint:30} {result['status']:10} "
                  f"{result.get('response_time_ms', 0):.0f}ms")
            
            if result['status'] == 'success':
                successful += 1
                total_time += result.get('response_time_ms', 0)
        
        # Calculate metrics
        total_checks = len(endpoints)
        success_rate = (successful / total_checks) * 100
        avg_response_time = total_time / successful if successful > 0 else 0
        
        results['summary'] = {
            'total_checks': total_checks,
            'successful': successful,
            'failed': total_checks - successful,
            'success_rate_percent': success_rate,
            'average_response_time_ms': avg_response_time,
            'status': 'HEALTHY' if success_rate >= 80 else 'WARNINGS' if success_rate >= 50 else 'CRITICAL'
        }
        
        return results
    
    def display_metrics(self, results: Dict):
        """Display metrics summary"""
        summary = results['summary']
        
        print("\n" + "=" * 70)
        print("HEALTH CHECK RESULTS")
        print("=" * 70)
        print(f"Timestamp:              {results['timestamp']}")
        print(f"Successful Checks:      {summary['successful']}/{summary['total_checks']}")
        print(f"Success Rate:           {summary['success_rate_percent']:.1f}%")
        print(f"Average Response Time:  {summary['average_response_time_ms']:.1f}ms")
        print(f"Overall Status:         {summary['status']}")
        
    def continuous_monitor(self, duration_minutes: int = 60):
        """Run continuous monitoring"""
        print(f"\n[MONITOR] Starting continuous monitoring for {duration_minutes} minutes")
        print(f"[MONITOR] Check interval: {self.check_interval} seconds")
        
        start_time = time.time()
        duration_seconds = duration_minutes * 60
        check_count = 0
        
        while (time.time() - start_time) < duration_seconds:
            try:
                check_count += 1
                print(f"\n[CHECK #{check_count}] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                
                results = self.run_health_check()
                self.display_metrics(results)
                
                # Log results
                self._log_results(results)
                
                elapsed = time.time() - start_time
                remaining = duration_seconds - elapsed
                print(f"\n[TIMER] Elapsed: {elapsed:.0f}s | Remaining: {remaining:.0f}s")
                
                if remaining > 0:
                    time.sleep(self.check_interval)
                    
            except KeyboardInterrupt:
                print("\n[MONITOR] Monitoring stopped by user")
                break
            except Exception as e:
                print(f"[ERROR] Monitoring error: {str(e)}")
                time.sleep(self.check_interval)
        
        print(f"\n[MONITOR] Monitoring completed after {check_count} checks")
        self._generate_report(check_count)
    
    def _log_results(self, results: Dict):
        """Log results to file"""
        try:
            log_file = "monitoring-log.jsonl"
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(results, indent=2) + "\n")
        except Exception as e:
            print(f"[WARN] Could not log results: {str(e)}")
    
    def _generate_report(self, check_count: int):
        """Generate monitoring report"""
        print("\n" + "=" * 70)
        print("MONITORING SESSION REPORT")
        print("=" * 70)
        print(f"Duration:        {(time.time() - self.start_time) / 60:.1f} minutes")
        print(f"Total Checks:    {check_count}")
        print(f"Check Interval:  {self.check_interval} seconds")
        print(f"Log File:        monitoring-log.jsonl")
        print("\nTo analyze logs:")
        print(f"  python -c \"")
        print(f"import json")
        print(f"with open('monitoring-log.jsonl') as f:")
        print(f"    for line in f: print(json.dumps(json.loads(line), indent=2))\"")


def main():
    """Main entry point"""
    print("=" * 70)
    print("TOOLSFORGE PDF EDITOR - PRODUCTION MONITORING")
    print("=" * 70)
    
    # Get configuration
    app_url = input("\nApplication URL (default: http://localhost:3000): ").strip()
    if not app_url:
        app_url = "http://localhost:3000"
    
    check_interval = 30  # Default 30 seconds
    response = input(f"Check interval in seconds (default: {check_interval}): ").strip()
    if response.isdigit():
        check_interval = int(response)
    
    mode = input("\nMonitoring mode:\n1. Single health check\n2. Continuous monitoring\nSelect (1-2): ").strip()
    
    dashboard = MonitoringDashboard(app_url, check_interval)
    
    if mode == '1':
        # Single check
        results = dashboard.run_health_check()
        dashboard.display_metrics(results)
    elif mode == '2':
        # Continuous monitoring
        duration = input("Duration in minutes (default: 60): ").strip()
        if duration.isdigit():
            duration = int(duration)
        else:
            duration = 60
        dashboard.continuous_monitor(duration)
    else:
        print("[ERROR] Invalid selection")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[INFO] Monitoring stopped")
    except Exception as e:
        print(f"\n[FATAL] {str(e)}")
        import traceback
        traceback.print_exc()
