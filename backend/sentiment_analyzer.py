import re
from typing import Dict, Any
from textblob import TextBlob
from collections import Counter

STOPWORDS = {
    "the", "and", "is", "in", "it", "to", "of", "a", "that", "this", "for", "with", 
    "on", "as", "are", "be", "was", "or", "by", "an", "not", "but", "what", "all", 
    "were", "when", "we", "there", "can", "if", "your", "has", "do", "will", "so", 
    "up", "out", "about", "who", "which", "their", "them", "some", "my", "me", 
    "they", "he", "she", "you", "i", "at", "from", "have", "no", "just", "like", 
    "how", "then", "than", "more", "its", "been", "would", "could", "should", "very",
    "http", "https", "com", "www"
}

def analyze_profile_sentiment(profile_data: Dict[str, Any]) -> Dict[str, Any]:
    texts = []
    platforms = profile_data.get("platforms", [])
    
    for p in platforms:
        if p.get("found"):
            bio = p.get("bio", "")
            if bio:
                texts.append(bio)
            
            for post in p.get("posts", []):
                title = post.get("title") or post.get("name") or ""
                desc = post.get("description") or ""
                combined = f"{title} {desc}".strip()
                if combined:
                    texts.append(combined)
    
    if not texts:
        return {
            "polarity": 0.0,
            "subjectivity": 0.0,
            "sentiment_index": 0,
            "overall_tone": "NEUTRAL",
            "items_analyzed": 0,
            "top_keywords": [],
            "flagged_phrases": []
        }
        
    total_polarity = 0.0
    total_subjectivity = 0.0
    flagged_phrases = []
    all_words = []
    
    for t in texts:
        blob = TextBlob(t)
        pol = blob.sentiment.polarity
        sub = blob.sentiment.subjectivity
        
        total_polarity += pol
        total_subjectivity += sub
        
        # Flag if highly negative
        if pol <= -0.3:
            # Clean up URL-heavy texts for display
            clean_t = re.sub(r'https?://\S+', '[LINK]', t)
            flagged_phrases.append(clean_t)
            
        # extract words
        words = re.findall(r'\b[a-zA-Z]{3,}\b', t.lower())
        for w in words:
            if w not in STOPWORDS:
                all_words.append(w)
                
    avg_polarity = total_polarity / len(texts)
    avg_subjectivity = total_subjectivity / len(texts)
    sentiment_index = round(avg_polarity * 100)
    
    if avg_polarity <= -0.1:
        overall_tone = "HOSTILE / AGGRESSIVE"
    elif avg_polarity >= 0.1:
        overall_tone = "POSITIVE / FRIENDLY"
    else:
        overall_tone = "NEUTRAL"
        
    word_counts = Counter(all_words)
    top_20 = word_counts.most_common(20)
    top_keywords = [{"text": w, "value": c} for w, c in top_20]
    
    # Sort flagged phrases by most negative (roughly by length/content since we don't store individual polarities)
    # Actually just take the longest ones as they might have more context
    flagged_phrases.sort(key=len, reverse=True)
    
    return {
        "polarity": round(avg_polarity, 2),
        "subjectivity": round(avg_subjectivity, 2),
        "sentiment_index": sentiment_index,
        "overall_tone": overall_tone,
        "items_analyzed": len(texts),
        "top_keywords": top_keywords,
        "flagged_phrases": flagged_phrases[:10]  # limit to top 10
    }
