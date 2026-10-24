import numpy as np
from datetime import datetime, date

def numpy_to_python(obj):
    """
    Recursively convert NumPy types and datetime objects to standard Python types for JSON serialization.
    """
    if isinstance(obj, dict):
        return {k: numpy_to_python(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [numpy_to_python(item) for item in obj]
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return numpy_to_python(obj.tolist())
    elif isinstance(obj, (np.bool_)):
        return bool(obj)
    
    # Generic string fallback for any other non-serializable objects (like Decimal, etc.)
    if not isinstance(obj, (str, int, float, bool, type(None))):
        return str(obj)
        
    return obj
