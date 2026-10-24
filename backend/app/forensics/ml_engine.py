import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
import joblib
import os
import json

class ForensicMLEngine:
    """
    Hybrid ML Engine for Document Authenticity.
    Combines Anomaly Detection (Isolation Forest) and Classification (Random Forest).
    """
    
    def __init__(self, model_dir="app/forensics/models"):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self.iso_forest = None
        self.random_forest = None
        self.feature_names = [
            'math_consistency', 
            'ela_mean', 
            'noise_variance', 
            'font_std', 
            'structural_integrity',
            'narration_score',
            'metadata_trust'
        ]
        self._initialize_models()

    def _initialize_models(self):
        """Build initial models based on synthetic 'ground truth' if not exists."""
        # For this implementation, we simulate a 'perfect' baseline
        # In a real environment, this would load from disk.
        
        # Create synthetic training data: 
        # 1. Genuine documents (high scores, low noise/ela)
        # 2. Forged documents (low math, high ela, weird fonts)
        
        n_samples = 100
        
        # Genuine
        genuine = pd.DataFrame({
            'math_consistency': [1.0] * n_samples,
            'ela_mean': np.random.normal(1.2, 0.3, n_samples),
            'noise_variance': np.random.normal(400, 100, n_samples),
            'font_std': np.random.normal(2.0, 0.5, n_samples),
            'structural_integrity': np.random.normal(1.0, 0.05, n_samples),
            'narration_score': np.random.normal(0.95, 0.05, n_samples),
            'metadata_trust': [1.0] * n_samples,
            'label': [0] * n_samples # 0 = Genuine
        })
        
        # Fraud
        fraud = pd.DataFrame({
            'math_consistency': [0.0] * n_samples,
            'ela_mean': np.random.normal(5.0, 1.5, n_samples),
            'noise_variance': np.random.normal(1500, 300, n_samples),
            'font_std': np.random.normal(12.0, 3.0, n_samples),
            'structural_integrity': np.random.normal(0.6, 0.2, n_samples),
            'narration_score': np.random.normal(0.4, 0.2, n_samples),
            'metadata_trust': [0.0] * n_samples,
            'label': [1] * n_samples # 1 = Fake
        })
        
        data = pd.concat([genuine, fraud], ignore_index=True)
        X = data[self.feature_names]
        y = data['label']
        
        # Train Isolation Forest (Anomaly Detection)
        self.iso_forest = IsolationForest(contamination=0.1, random_state=42)
        self.iso_forest.fit(X[y == 0]) # Train only on genuine data
        
        # Train Random Forest (Classification)
        self.random_forest = RandomForestClassifier(n_estimators=50, random_state=42)
        self.random_forest.fit(X, y)

    def predict(self, feature_dict: dict) -> dict:
        """
        Compute scores and verdict for a single document.
        """
        # 1. Prepare Vector
        vec = []
        for feat in self.feature_names:
            val = feature_dict.get(feat, 0.5)
            # Clip and normalize
            vec.append(val)
        
        X_test = pd.DataFrame([vec], columns=self.feature_names)
        
        # 2. Isolation Forest Score (Outlier score)
        # decision_function returns lower values for outliers
        # We normalize it so higher = more anomalous (0 to 1)
        raw_anomaly = self.iso_forest.decision_function(X_test)[0]
        anomaly_score = 1.0 - ((raw_anomaly + 0.5) / 1.0) # Heuristic normalization
        anomaly_score = max(0, min(1, anomaly_score))
        
        # 3. Random Forest Probability
        ml_prob = self.random_forest.predict_proba(X_test)[0][1] # Probability of class 1 (Fake)
        
        # 4. Weighted Consensus
        # Rules (math_consistency) carry heavy weight
        rule_score = 1.0 - feature_dict.get('math_consistency', 1.0)
        
        # final_score calculation
        # 40% ML Classification, 30% Anomaly Detection, 30% Hard Rules
        final_score = (ml_prob * 0.45) + (anomaly_score * 0.25) + (rule_score * 0.30)
        
        # Determine Verdict
        verdict = "REAL" if final_score < 0.4 else "FAKE"
        confidence = 1.0 - final_score if verdict == "REAL" else final_score
        
        return {
            "verdict": verdict,
            "confidence_score": float(confidence),
            "anomaly_score": float(anomaly_score),
            "ml_score": float(ml_prob),
            "rule_score": float(rule_score),
            "features": feature_dict
        }
