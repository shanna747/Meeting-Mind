// NEW IMPROVED SEARCH FUNCTIONS - To be integrated into app.js

// Helper 1: Detect document type (FAQ vs Article)
function detectDocumentType(content) {
    const lines = content.split(/\n+/);
    const questionStarters = ['how', 'what', 'when', 'where', 'why', 'who', 'can', 'do', 'does', 'will', 'should', 'is', 'are', 'if'];

    let questionCount = 0;
    let totalLines = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length < 10) continue;

        totalLines++;
        const lineLower = trimmed.toLowerCase();

        const startsWithQuestionWord = questionStarters.some(starter =>
            lineLower.startsWith(starter + ' ')
        );
        const hasQuestionMark = trimmed.includes('?');

        if ((startsWithQuestionWord || hasQuestionMark) && trimmed.length < 150) {
            questionCount++;
        }
    }

    // If more than 20% of lines are questions, it's an FAQ
    const questionRatio = totalLines > 0 ? questionCount / totalLines : 0;
    return questionRatio > 0.2 ? 'faq' : 'article';
}

// Helper 2: Search FAQ documents
function searchFAQDocument(question, content, keywords) {
    const lines = content.split(/\n+/);
    const questionStarters = ['how', 'what', 'when', 'where', 'why', 'who', 'can', 'do', 'does', 'will', 'should', 'is', 'are', 'if'];

    let qaPatterns = [];
    let currentQuestion = null;
    let currentAnswer = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 5) continue;

        const lineLower = trimmed.toLowerCase();

        // Check if this line is a question
        const startsWithQuestionWord = questionStarters.some(starter =>
            lineLower.startsWith(starter + ' ')
        );
        const hasQuestionMark = trimmed.includes('?');
        const isShortEnough = trimmed.length < 150;

        if ((startsWithQuestionWord || hasQuestionMark) && isShortEnough) {
            // Save previous Q&A pair
            if (currentQuestion && currentAnswer.length > 0) {
                qaPatterns.push({
                    question: currentQuestion,
                    answer: currentAnswer.join(' ').trim()
                });
            }
            // Start new Q&A pair
            currentQuestion = trimmed.replace(/\?+$/, '').trim();
            currentAnswer = [];
        } else if (currentQuestion && trimmed.length > 10) {
            // Add to current answer
            currentAnswer.push(trimmed);
        }
    }

    // Save last Q&A pair
    if (currentQuestion && currentAnswer.length > 0) {
        qaPatterns.push({
            question: currentQuestion,
            answer: currentAnswer.join(' ').trim()
        });
    }

    console.log(`Found ${qaPatterns.length} Q&A pairs in FAQ`);

    // Match user's question to best Q&A pair
    let bestQA = null;
    let bestQAScore = 0;
    const questionLower = question.toLowerCase();

    for (const qa of qaPatterns) {
        const qaQuestionLower = qa.question.toLowerCase();
        let qaScore = 0;

        // Score based on keyword matches
        keywords.forEach(keyword => {
            if (qaQuestionLower.includes(keyword)) {
                qaScore += 20;
            }
        });

        // Bonus for similar word overlap
        const questionWords = questionLower.split(/\s+/);
        const qaWords = qaQuestionLower.split(/\s+/);
        const commonWords = questionWords.filter(w => qaWords.includes(w) && w.length > 2).length;
        qaScore += commonWords * 10;

        if (qaScore > bestQAScore) {
            bestQAScore = qaScore;
            bestQA = qa;
        }
    }

    console.log(`Best FAQ Q&A match score: ${bestQAScore}`);

    // Return answer if we found a good match (minimum score 30)
    if (bestQA && bestQAScore >= 30 && bestQA.answer.length > 10) {
        return bestQA.answer;
    }

    return null;
}

// Helper 3: Search Article documents
function searchArticleDocument(question, content, keywords) {
    const contentLower = content.toLowerCase();

    // Split into sentences
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];

    let bestSentences = [];
    let bestScore = 0;

    // Find sentences that contain the most keywords
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        const sentenceLower = sentence.toLowerCase();

        if (sentence.length < 20) continue;

        let score = 0;
        keywords.forEach(keyword => {
            if (sentenceLower.includes(keyword)) {
                score += 15;
            }
        });

        if (score > bestScore) {
            bestScore = score;
            // Include surrounding context (previous and next sentence)
            bestSentences = [];
            if (i > 0) bestSentences.push(sentences[i - 1].trim());
            bestSentences.push(sentence);
            if (i < sentences.length - 1) bestSentences.push(sentences[i + 1].trim());
        }
    }

    console.log(`Best article match score: ${bestScore}`);

    // Return if we found a good match (minimum score 20)
    if (bestSentences.length > 0 && bestScore >= 20) {
        return bestSentences.join(' ').substring(0, 400);
    }

    return null;
}

// Main function: Replace the existing fallbackKeywordSearch function with this
async function fallbackKeywordSearch(question, documents) {
    const questionLower = question.toLowerCase();

    // Extract meaningful keywords
    const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'i', 'you', 'we', 'they', 'it', 'this', 'that', 'my', 'your'];
    const allTokens = questionLower.match(/\w+|[+\-*/=]/g) || [];
    const keywords = allTokens.filter(token =>
        token.length > 2 && !stopWords.includes(token)
    );

    if (keywords.length === 0) {
        keywords.push(...allTokens.filter(t => t.length > 0));
    }

    console.log('Fallback search - keywords:', keywords);

    let bestResult = null;
    let bestScore = 0;

    for (const doc of documents) {
        try {
            let content = '';

            // Extract document content (keeping existing extraction logic)
            if (doc.type === 'text/plain' || doc.name.endsWith('.txt')) {
                const base64Data = doc.data.split(',')[1];
                content = atob(base64Data);
            } else if (doc.name.endsWith('.docx')) {
                const base64Data = doc.data.split(',')[1];
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                if (typeof mammoth !== 'undefined') {
                    const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
                    content = result.value;
                } else {
                    continue;
                }
            } else {
                continue;
            }

            if (!content || content.length < 20) continue;

            // Detect document type
            const docType = detectDocumentType(content);
            console.log(`Document "${doc.name}" detected as: ${docType}`);

            // Use appropriate search strategy
            let answer = null;
            if (docType === 'faq') {
                answer = searchFAQDocument(question, content, keywords);
            } else {
                answer = searchArticleDocument(question, content, keywords);
            }

            if (answer) {
                // Score based on answer quality
                let score = answer.length > 20 ? 50 : 20;
                keywords.forEach(k => {
                    if (answer.toLowerCase().includes(k)) score += 10;
                });

                if (score > bestScore) {
                    bestScore = score;
                    bestResult = { doc, answer, docType };
                }
            }

        } catch (err) {
            console.error('Error processing document:', doc.name, err);
        }
    }

    console.log('Best result score:', bestScore);

    // Require minimum score of 40 for relevance
    if (bestResult && bestScore >= 40) {
        return `Based on "${bestResult.doc.name}":\n\n${bestResult.answer}`;
    }

    console.log('No relevant answer found');
    return "Answer not available";
}
