import natural from 'natural';
import * as stopword from 'stopword';

// Industry keywords mapping
const industryKeywords = {
  construction: [
    'construction', 'building', 'contractor', 'renovation', 'remodeling',
    'excavation', 'carpentry', 'masonry', 'roofing', 'plumbing', 'electrical',
    'general contractor', 'construction company', 'builders', 'development'
  ],
  restaurant: [
    'restaurant', 'cafe', 'bistro', 'eatery', 'diner', 'grill', 'steakhouse',
    'pizzeria', 'bakery', 'catering', 'food truck', 'bar & grill', 'pub',
    'coffee shop', 'fast food', 'takeout', 'delivery'
  ],
  technology: [
    'technology', 'software', 'IT', 'computer', 'development', 'programming',
    'web design', 'app development', 'cybersecurity', 'cloud', 'data',
    'artificial intelligence', 'AI', 'machine learning', 'blockchain',
    'SaaS', 'tech company', 'software development'
  ],
  healthcare: [
    'healthcare', 'medical', 'hospital', 'clinic', 'dental', 'pharmacy',
    'wellness', 'health', 'doctor', 'physician', 'nursing', 'therapy',
    'medical center', 'health services', 'patient care'
  ],
  retail: [
    'retail', 'store', 'shop', 'boutique', 'outlet', 'merchandise',
    'fashion', 'clothing', 'apparel', 'gift shop', 'convenience store',
    'supermarket', 'grocery', 'shopping', 'ecommerce', 'online store'
  ],
  real_estate: [
    'real estate', 'property', 'realtor', 'broker', 'housing', 'apartment',
    'condo', 'commercial property', 'land', 'development', 'realty',
    'property management', 'estate agent', 'home sales'
  ],
  education: [
    'education', 'school', 'university', 'college', 'training', 'learning',
    'academy', 'institute', 'tutoring', 'educational services', 'courses',
    'workshops', 'seminar', 'education center'
  ],
  automotive: [
    'automotive', 'car', 'auto', 'vehicle', 'dealership', 'repair',
    'mechanic', 'tire', 'auto service', 'car sales', 'auto parts',
    'maintenance', 'oil change', 'brake service'
  ]
};

// Enhanced industry detection with NLP
const detectIndustry = (text) => {
  if (!text || text.length < 10) return null;
  
  // Tokenize and clean text
  const tokenizer = new natural.WordTokenizer();
  let tokens = tokenizer.tokenize(text.toLowerCase());
  
  // Remove stopwords
  tokens = stopword.removeStopwords(tokens);
  
  // Stem words
  const stemmer = natural.PorterStemmer;
  const stemmedTokens = tokens.map(token => stemmer.stem(token));
  
  // Count industry keyword matches
  const industryScores = {};
  
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    const stemmedKeywords = keywords.map(keyword => {
      const keywordTokens = tokenizer.tokenize(keyword.toLowerCase());
      return keywordTokens.map(token => stemmer.stem(token));
    }).flat();
    
    const matches = stemmedTokens.filter(token => 
      stemmedKeywords.includes(token)
    );
    
    industryScores[industry] = matches.length;
  }
  
  // Find industry with highest score
  let detectedIndustry = null;
  let highestScore = 0;
  
  for (const [industry, score] of Object.entries(industryScores)) {
    if (score > highestScore) {
      highestScore = score;
      detectedIndustry = industry;
    }
  }
  
  // Only return industry if we have reasonable confidence
  return highestScore >= 2 ? detectedIndustry : null;
};

// Extract industry from company data
const extractIndustryFromCompany = (companyData) => {
  const textSources = [
    companyData.name,
    companyData.description,
    companyData.websiteContent || ''
  ].filter(Boolean).join(' ');
  
  return detectIndustry(textSources);
};

export { detectIndustry, extractIndustryFromCompany, industryKeywords };