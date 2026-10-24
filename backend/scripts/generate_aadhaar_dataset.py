import os
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import uuid

class AadhaarDatasetGenerator:
    def __init__(self, output_dir="dataset/aadhaar"):
        self.output_dir = output_dir
        self.img_w, self.img_h = 1012, 638
        self.label_map = {
            "UID": 0,
            "QR_CODE": 1,
            "PROFILE_PHOTO": 2,
            "LOCAL_NAME": 3,
            "ENGLISH_NAME": 4,
            "ISSUED_DATE": 5,
            "FOOTER_CONTACT": 6,
            "ERROR_REGION": 7
        }
        
        # Setup directories
        for sub in ["images", "labels"]:
            os.makedirs(os.path.join(output_dir, sub), exist_ok=True)

    def draw_text(self, draw, text, pos, font_size=30, color=(0,0,0)):
        # Simplified text drawing - in a real scenario we'd use a specific .ttf font
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
        draw.text(pos, text, fill=color, font=font)

    def generate_sample(self, side="FRONT", is_invalid=False):
        """
        Generates an Aadhaar sample image and its YOLO labels.
        is_invalid triggers a specific error condition requested by the user.
        """
        img = Image.new('RGB', (self.img_w, self.img_h), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        boxes = []
        
        # Helper to add box to list
        def add_box(label, x_center, y_center, w, h):
            id = self.label_map[label]
            boxes.append(f"{id} {x_center/self.img_w} {y_center/self.img_h} {w/self.img_w} {h/self.img_h}")

        if side == "FRONT":
            # Header
            self.draw_text(draw, "Government of India", (400, 30), 40)
            
            # Profile Photo (Left)
            photo_rect = [100, 150, 300, 400]
            draw.rectangle(photo_rect, outline=(200, 200, 200), width=2)
            add_box("PROFILE_PHOTO", 200, 275, 200, 250)
            
            # Issued Date (Vertical near photo)
            issued_date_text = "Issued: 24/05/2018"
            if not (is_invalid and "issued" in str(is_invalid).lower()):
                self.draw_text(draw, issued_date_text, (50, 200), 20)
                add_box("ISSUED_DATE", 60, 300, 30, 200)
            else:
                # Add a marker for missing/wrong issued date error
                add_box("ERROR_REGION", 60, 300, 40, 200)

            # Names (Local 1st, English 2nd)
            local_name = "அஷ்வின் ஈஷ்வர்" # Example Tamil
            eng_name = "Ashwin Eshwer"
            
            if is_invalid == "NAME_ORDER":
                # Wrong order: English first
                self.draw_text(draw, eng_name, (400, 180), 32)
                self.draw_text(draw, local_name, (400, 230), 32)
                add_box("ERROR_REGION", 600, 210, 500, 100)
            else:
                self.draw_text(draw, local_name, (400, 180), 32)
                self.draw_text(draw, eng_name, (400, 230), 34)
                add_box("LOCAL_NAME", 600, 195, 400, 40)
                add_box("ENGLISH_NAME", 600, 245, 400, 40)
            
            # DOB & Gender
            self.draw_text(draw, "DOB: 09/01/2006", (400, 290), 28)
            self.draw_text(draw, "MALE", (400, 330), 28)
            
            # 12-digit UID (Bottom)
            uid = "2863 3052 5969"
            if is_invalid == "UID_LENGTH":
                uid = "2863 3052 59" # 10 digits (Wrong)
                add_box("ERROR_REGION", 500, 550, 600, 80)
            else:
                add_box("UID", 500, 550, 600, 80)
            
            self.draw_text(draw, uid, (350, 520), 50, color=(0,0,0))

        else: # BACK SIDE
            # Native Address
            self.draw_text(draw, "Address: No 32, Velammal Ave, Chennai - 600067", (50, 100), 25)
            add_box("LOCAL_NAME", 300, 150, 500, 100) # Reusing label for address block
            
            # QR Code (Nearby address)
            if is_invalid == "MISSING_QR":
                draw.rectangle([700, 150, 950, 400], outline=(255, 0, 0), width=3)
                add_box("ERROR_REGION", 825, 275, 250, 250)
            else:
                # Placeholder for QR
                draw.rectangle([700, 150, 950, 400], fill=(50, 50, 50))
                add_box("QR_CODE", 825, 275, 250, 250)
            
            # 12-digit UID
            self.draw_text(draw, "2863 3052 5969", (350, 480), 40)
            add_box("UID", 500, 500, 400, 60)
            
            # Footer Details (Mandatory)
            footer_text = "1947 | help@uidai.gov.in | www.uidai.gov.in"
            if is_invalid == "MISSING_FOOTER":
                add_box("ERROR_REGION", 500, 600, 900, 40)
            else:
                self.draw_text(draw, footer_text, (100, 580), 20)
                add_box("FOOTER_CONTACT", 500, 595, 800, 30)

        # Save
        filename = f"{side}_{uuid.uuid4().hex[:8]}"
        img.save(os.path.join(self.output_dir, "images", f"{filename}.jpg"))
        with open(os.path.join(self.output_dir, "labels", f"{filename}.txt"), "w") as f:
            f.write("\n".join(boxes))
            
        return filename

    def generate_batch(self, count=20):
        print(f"Generating {count} Aadhaar samples...")
        for _ in range(count // 2):
            self.generate_sample(side="FRONT", is_invalid=random.choice([None, "NAME_ORDER", "UID_LENGTH", "ISSUED"]))
            self.generate_sample(side="BACK", is_invalid=random.choice([None, "MISSING_QR", "MISSING_FOOTER"]))
        print("Dataset generation complete.")

if __name__ == "__main__":
    gen = AadhaarDatasetGenerator()
    gen.generate_batch(20)
