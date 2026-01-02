#!/usr/bin/env python3
"""
Fetch personal best times from Power of 10 (UK athletics rankings database)
"""
import sys
import json
from power_of_10 import AthleteProfile

def get_personal_bests(athlete_id):
    """
    Fetch personal best times for a given athlete ID from Power of 10
    
    Args:
        athlete_id: The athlete's Power of 10 ID (numeric)
        
    Returns:
        Dictionary containing personal best times for various distances
    """
    try:
        # Get athlete profile using the power-of-10 library
        athlete = AthleteProfile(athlete_id)
        
        # Extract personal bests
        pbs = {}
        
        # Get the athlete's PBs
        if hasattr(athlete, 'pbs') and athlete.pbs:
            for event, data in athlete.pbs.items():
                if isinstance(data, dict):
                    pbs[event] = {
                        'time': data.get('perf', ''),
                        'venue': data.get('venue', ''),
                        'date': data.get('date', '')
                    }
                elif hasattr(data, 'perf'):
                    pbs[event] = {
                        'time': data.perf if hasattr(data, 'perf') else '',
                        'venue': data.venue if hasattr(data, 'venue') else '',
                        'date': data.date if hasattr(data, 'date') else ''
                    }
        
        return {
            'success': True,
            'athlete_id': athlete_id,
            'name': athlete.name if hasattr(athlete, 'name') else 'Unknown',
            'personal_bests': pbs
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'athlete_id': athlete_id
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Please provide athlete ID as argument'
        }))
        sys.exit(1)
    
    athlete_id = sys.argv[1]
    result = get_personal_bests(athlete_id)
    print(json.dumps(result, indent=2))
