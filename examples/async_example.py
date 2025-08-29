#!/usr/bin/env python3
"""
Async Python debugging example for MCP debugger.

This demonstrates debugging asynchronous Python code with async/await patterns.
"""

import asyncio
import aiohttp
import time

async def fetch_data(url: str) -> dict:
    """Fetch data from a URL asynchronously."""
    print(f"Fetching data from {url}")
    
    # Set breakpoint here to inspect URL and debug async function
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as response:
                data = await response.json()
                print(f"Received data: {data}")
                return data
        except Exception as e:
            print(f"Error fetching data: {e}")
            return {"error": str(e)}

async def process_multiple_urls():
    """Process multiple URLs concurrently."""
    urls = [
        "https://jsonplaceholder.typicode.com/posts/1",
        "https://jsonplaceholder.typicode.com/posts/2", 
        "https://jsonplaceholder.typicode.com/posts/3"
    ]
    
    # Set breakpoint here to debug concurrent execution
    tasks = [fetch_data(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Set breakpoint here to inspect results
    print("All requests completed")
    return results

async def simulate_processing():
    """Simulate some processing work."""
    for i in range(3):
        print(f"Processing step {i + 1}")
        await asyncio.sleep(0.5)  # Set breakpoint here to debug async sleep
        
        # Simulate some work
        data = {"step": i + 1, "timestamp": time.time()}
        print(f"Step {i + 1} data: {data}")

async def main():
    """Main async function."""
    print("🔄 Starting async debugging example")
    
    # Test concurrent URL fetching
    try:
        print("\n--- Testing concurrent requests ---")
        url_results = await process_multiple_urls()
        print(f"URL fetch results: {len(url_results)} completed")
    except Exception as e:
        print(f"Error in URL processing: {e}")
    
    # Test sequential processing
    print("\n--- Testing sequential processing ---")
    await simulate_processing()
    
    print("\n✅ Async example completed")

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())