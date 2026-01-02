#!/usr/bin/env python3
"""
Fetch personal best times from Power of 10 (UK athletics rankings database)
"""
import sys
import json
import requests
from bs4 import BeautifulSoup

def get_personal_bests(athlete_id):
    """
    Fetch personal best times for a given athlete ID from Power of 10
    
    Args:
        athlete_id: The athlete's Power of 10 ID (numeric)
        
    Returns:
        Dictionary containing personal best times for various distances
    """
    try:
        # Fetch the athlete's page
        url = f"https://www.thepowerof10.info/athletes/profile.aspx?athleteid={athlete_id}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse the HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Get athlete name from the h2 tag
        athlete_name = 'Unknown'
        name_tag = soup.find('h2')
        if name_tag:
            athlete_name = name_tag.get_text().strip()
        
        # Find the personal bests table - look for the table with "Best known performances" heading
        pbs = {}
        
        # Find the section with "Best known performances"
        best_perf_heading = soup.find(string=lambda text: text and 'Best known performances' in text)
        
        if best_perf_heading:
            # Find the next table after this heading
            parent = best_perf_heading.find_parent()
            if parent:
                table = parent.find_next('table')
                
                if table:
                    rows = table.find_all('tr')
                    
                    # First row contains headers and column years
                    # Second row onwards contain the data
                    for row in rows[1:]:  # Skip first row (headers)
                        cols = row.find_all('td')
                        
                        if len(cols) >= 3:
                            event = cols[0].get_text().strip()
                            pb_cell = cols[1].get_text().strip() if len(cols) > 1 else ''
                            
                            # Extract just the PB time (first value before other data)
                            pb_time = pb_cell.split()[0] if pb_cell else ''
                            
                            # Only include valid events with times
                            if event and pb_time and event != 'Event' and pb_time not in ['', '-']:
                                pbs[event] = {
                                    'time': pb_time,
                                    'venue': '',  # Venue not in PB summary table
                                    'date': ''     # Date not in PB summary table
                                }
        
        return {
            'success': True,
            'athlete_id': athlete_id,
            'name': athlete_name,
            'personal_bests': pbs
        }
        
    except requests.exceptions.RequestException as e:
        return {
            'success': False,
            'error': f'Request error: {str(e)}',
            'athlete_id': athlete_id
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
