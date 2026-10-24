import re

class VerificationModules:
    @staticmethod
    def validate_aadhaar(aadhaar_num: str) -> bool:
        """
        Validates Aadhaar number using Verhoeff algorithm.
        """
        # Verhoeff tables
        d = [
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
            [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
            [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
            [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
            [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
            [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
            [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
            [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
            [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
        ]
        p = [
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
            [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
            [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
            [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
            [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
            [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
            [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
        ]
        inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

        if not re.match(r"^[2-9]\d{11}$", aadhaar_num):
            return False

        c = 0
        for i, digit in enumerate(reversed(aadhaar_num)):
            c = d[c][p[i % 8][int(digit)]]
        
        return c == 0

    @staticmethod
    def validate_mrz_checksum(mrz_line: str) -> bool:
        """
        Validates MRZ checksum for Passports (ICAO Doc 9303).
        """
        if len(mrz_line) < 10: return False
        
        weights = [7, 3, 1]
        check_sum = 0
        
        for i, char in enumerate(mrz_line[:-1]):
            if char == '<':
                val = 0
            elif char.isdigit():
                val = int(char)
            else:
                val = ord(char) - 55
            
            check_sum += val * weights[i % 3]
            
        return (check_sum % 10) == int(mrz_line[-1])
