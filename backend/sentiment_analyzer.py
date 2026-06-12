import re
from collections import Counter
from textblob import TextBlob

STOPWORDS = {
    "the", "a", "an", "is", "in", "on", "at", "to", "for", "of", "and", "or", "with",
    "that", "this", "it", "was", "are", "be", "by", "from", "as", "but", "not", "have",
    "he", "she", "they", "we", "you", "i", "my", "his", "her", "their", "your", "its"
}

AGGRESSION_KEYWORDS = {
    "kill", "attack", "threat", "bomb", "hack", "fraud", "scam", "revenge", "destroy", "violence", "doxx", "stalk"
}

def classify_tone(polarity: float, subjectivity: float) -> str:
    if polarity > 0.3:
        return "POSITIVE"
    elif polarity < -0.2:
        return "AGGRESSIVE"
    elif subjectivity > 0.7:
        return "PROMOTIONAL"
    else:
        return "NEUTRAL"

def analyze_sentiment(profile_data: dict) -> dict:
    platforms = profile_data.get("platforms", [])
    
    overall_texts = []
    platform_sentiments = {}
    flagged_phrases = []
    
    # 1. Collect all text and analyze per-platform sentiment
    for p in platforms:
        if not p.get("found"):
            continue
        
        platform_name = p.get("platform", "")
        texts = []
        
        bio = p.get("bio")
        if bio:
            texts.append(bio)
            
        posts = p.get("posts") or []
        for post in posts:
            title = post.get("title") or post.get("name") or ""
            desc = post.get("description") or ""
            if title:
                texts.append(title)
            if desc:
                texts.append(desc)
                
        if not texts:
            continue
            
        combined_platform_text = " ".join(texts)
        overall_texts.append(combined_platform_text)
        
        # Analyze this platform
        p_blob = TextBlob(combined_platform_text)
        p_pol = p_blob.sentiment.polarity
        p_sub = p_blob.sentiment.subjectivity
        platform_sentiments[platform_name] = {
            "polarity": round(p_pol, 2),
            "subjectivity": round(p_sub, 2),
            "tone": classify_tone(p_pol, p_sub)
        }
        
        # Extract flagged sentences per platform text
        for sentence in p_blob.sentences:
            s_text = str(sentence).strip()
            # check aggression patterns
            s_lower = s_text.lower()
            if any(kw in s_lower for kw in AGGRESSION_KEYWORDS):
                # truncate to max 120 chars
                flagged_phrase = s_text[:120] + ("..." if len(s_text) > 120 else "")
                if flagged_phrase not in flagged_phrases:
                    flagged_phrases.append(flagged_phrase)

    # Combined overall text
    all_combined_text = " ".join(overall_texts)
    total_char_count = len(all_combined_text)
    
    blob = TextBlob(all_combined_text)
    overall_polarity = round(blob.sentiment.polarity, 2)
    overall_subjectivity = round(blob.sentiment.subjectivity, 2)
    overall_tone = classify_tone(overall_polarity, overall_subjectivity)
    
    # Also extract flagged sentences from overall text just in case (to catch cross-sentence logic)
    for sentence in blob.sentences:
        s_text = str(sentence).strip()
        s_lower = s_text.lower()
        if any(kw in s_lower for kw in AGGRESSION_KEYWORDS):
            flagged_phrase = s_text[:120] + ("..." if len(s_text) > 120 else "")
            if flagged_phrase not in flagged_phrases:
                flagged_phrases.append(flagged_phrase)
                
    # 2. Extract top keywords
    # Remove punctuation and split into words
    words = re.findall(r'[a-zA-Z]{3,}', all_combined_text.lower())
    filtered_words = [w for w in words if w not in STOPWORDS]
    
    counter = Counter(filtered_words)
    top_20 = counter.most_common(20)
    
    keyword_cloud_data = {word: count for word, count in top_20}
    top_keywords = [word for word, count in top_20]
    
    return {
        "overall_tone": overall_tone,
        "overall_polarity": overall_polarity,
        "overall_subjectivity": overall_subjectivity,
        "platform_sentiments": platform_sentiments,
        "top_keywords": top_keywords,
        "keyword_cloud_data": keyword_cloud_data,
        "flagged_phrases": flagged_phrases,
        "total_text_analyzed": total_char_count
    }
