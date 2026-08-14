import wikipedia
from ddgs import DDGS

def search_wikipedia(query: str) -> str:
    """Searches Wikipedia and returns a short summary of the page."""
    try:
        results = wikipedia.search(query)
        if not results:
            return "No Wikipedia page found for this query."
        
        summary = wikipedia.summary(results[0], sentences=5)
        return summary
    except Exception as e:
        return f"Error searching Wikipedia: {str(e)}"

def search_web(query: str) -> str:
    """Uses DuckDuckGo to search the web and returns a summary of top results."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=3))
            
        if not results:
            return "No web results found."
            
        formatted_results = []
        for r in results:
            formatted_results.append(f"Title: {r.get('title')}\nSnippet: {r.get('body')}")
            
        return "\n\n".join(formatted_results)
    except Exception as e:
        return f"Error searching web: {str(e)}"
