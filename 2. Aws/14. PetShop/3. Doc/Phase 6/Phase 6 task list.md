Here are the tasks you need to complete for **Phase 6: Upload PetShop Images using React, FastAPI, EC2, Lambda, S3, and RDS**. This list is based on your uploaded Phase 6 document, with Spring Boot replaced by FastAPI and with Lambda used only for suitable background image-processing work.


# Main Problem
Your PetShop application needs to allow sellers to upload product images.
The target flow is:
```text
Seller selects an image in React
        ↓
React sends the image to FastAPI on EC2
        ↓
FastAPI validates the image
        ↓
FastAPI uploads the image to Amazon S3
        ↓
FastAPI saves image metadata in RDS
        ↓
React displays the image
```
Lambda can later process images in the background:
```text
Image uploaded to S3
        ↓
S3 event triggers Lambda
        ↓
Lambda resizes or optimizes the image
        ↓
Lambda saves the processed image in S3
```

---
# Tasks You Need to Do
## Task 1: Decide the Upload Architecture
For the first version, use:
```text
React
  ↓ multipart/form-data
FastAPI on EC2
  ↓
Amazon S3
  ↓
RDS MySQL
```
Use Lambda later for:
```text
Image resizing
Thumbnail generation
Image optimization
Removing metadata
Background image validation
```
Checklist:
```text
[ ] Use FastAPI on EC2 for the upload API
[ ] Let FastAPI validate user permissions
[ ] Let FastAPI upload the original file to S3
[ ] Let FastAPI save image metadata in RDS
[ ] Use Lambda only for background image processing
[ ] Do not upload directly to Lambda for the first version
```

---
## Task 2: Create the S3 Bucket
Create:
```text
Bucket name: PetShop-product-images
Region: Same region as EC2, Lambda, and RDS
```
Configure:
```text
Block Public Access: Enabled
Default encryption: SSE-S3
Versioning: Optional
```
Checklist:
```text
[ ] Open the S3 Console
[ ] Select Create bucket
[ ] Enter PetShop-product-images
[ ] Select the correct AWS Region
[ ] Keep Block Public Access enabled
[ ] Enable default encryption
[ ] Create the bucket
```
Do not make the entire bucket public.

---
## Task 3: Design the S3 Object Keys
Use structured object keys.
Example:
```text
PetShop-items/{PetShopItemId}/{uuid}.jpg
```
Example result:
```text
PetShop-items/123/550e8400-e29b-41d4-a716-446655440000.jpg
```
For processed images:
```text
PetShop-items/123/original/{uuid}.jpg
PetShop-items/123/thumbnails/{uuid}.webp
```
Checklist:
```text
[ ] Use UUIDs for file names
[ ] Do not use the original filename as the main key
[ ] Include the PetShop item ID in the object key
[ ] Separate original and processed images
[ ] Save the object key in the database
```

---
## Task 4: Create an IAM Policy for S3
Create a policy that allows the backend to work only with the image bucket.
Required permissions:
```text
s3:PutObject
s3:GetObject
s3:DeleteObject
s3:ListBucket
```
Resource scope:
```text
arn:aws:s3:::PetShop-product-images
arn:aws:s3:::PetShop-product-images/*
```
Checklist:
```text
[ ] Open the IAM Console
[ ] Create an S3 policy for PetShop-product-images
[ ] Allow PutObject
[ ] Allow GetObject
[ ] Allow DeleteObject
[ ] Allow ListBucket
[ ] Restrict the policy to this bucket
```
Do not use full S3 administrator permissions.

---
## Task 5: Attach an IAM Role to EC2
Create or update:
```text
Role name: PetShop-backend-ec2-role
```
Attach the S3 policy from Task 4.
Checklist:
```text
[ ] Confirm PetShop-backend-ec2-role exists
[ ] Attach the S3 image policy
[ ] Attach the role to the EC2 instance
[ ] Confirm the EC2 instance sees the role
[ ] Do not create access keys for the EC2 application
```
Your FastAPI application should not contain:
```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```
when it runs on EC2 with an IAM role.

---
## Task 6: Create an IAM Role for Lambda
Create:
```text
Role name: PetShop-image-lambda-role
```
The role may need:
```text
s3:GetObject
s3:PutObject
s3:DeleteObject
CloudWatch Logs permissions
```
If Lambda writes image metadata to RDS, it may also need:
```text
VPC access permissions
Secrets Manager read permission
```
Checklist:
```text
[ ] Create PetShop-image-lambda-role
[ ] Add CloudWatch Logs permission
[ ] Add limited S3 permissions
[ ] Add VPC permissions only if Lambda connects to RDS
[ ] Add Secrets Manager permission only if required
[ ] Do not give AdministratorAccess
```

---
## Task 7: Create the `PetShop_images` Table
Use a separate table because one PetShop item can have multiple images.
Recommended structure:
```text
PetShop_images
├── id
├── PetShop_item_id
├── image_key
├── image_url
├── content_type
├── file_size
├── sort_order
├── is_primary
├── processing_status
└── created_at
```
Suggested processing statuses:
```text
UPLOADED
PROCESSING
READY
FAILED
```
Checklist:
```text
[ ] Create an PetShopImage SQLAlchemy model
[ ] Add PetShop_item_id
[ ] Add image_key
[ ] Add image_url
[ ] Add is_primary
[ ] Add sort_order
[ ] Add content_type
[ ] Add file_size
[ ] Add processing_status
[ ] Create an Alembic migration
[ ] Run alembic upgrade head
```

---
## Task 8: Install FastAPI Upload and S3 Dependencies
Install:
```bash
pip install python-multipart boto3
```
Your project may also need:
```bash
pip install pillow
```
Use Pillow only if FastAPI or Lambda processes images.
Checklist:
```text
[ ] Install python-multipart
[ ] Install boto3
[ ] Add the packages to requirements.txt or pyproject.toml
[ ] Install Pillow if image resizing is required
```

---
## Task 9: Configure the S3 Settings in FastAPI
Use environment variables:
```env
AWS_REGION=ap-southeast-1
S3_IMAGE_BUCKET=PetShop-product-images
IMAGE_MAX_SIZE_MB=5
```
You may later add:
```env
IMAGE_BASE_URL=https://cdn.example.com
```
Checklist:
```text
[ ] Add AWS_REGION
[ ] Add S3_IMAGE_BUCKET
[ ] Add IMAGE_MAX_SIZE_MB
[ ] Load the settings through your FastAPI configuration
[ ] Do not store AWS access keys in the `.env` file on EC2
```

---
## Task 10: Create the FastAPI S3 Service
Create a service responsible for:
```text
Generating object keys
Uploading files
Deleting files
Generating image URLs
Handling S3 errors
```
Suggested methods:
```text
upload_PetShop_image()
delete_PetShop_image()
generate_object_key()
get_image_url()
```
Checklist:
```text
[ ] Create an S3 service
[ ] Create a boto3 S3 client
[ ] Generate UUID-based object keys
[ ] Upload the file with put_object or upload_fileobj
[ ] Return the image key
[ ] Create a delete method
[ ] Handle S3 ClientError exceptions
```

---
## Task 11: Validate Uploaded Files
Allow only:
```text
image/jpeg
image/png
image/webp
```
Suggested maximum size:
```text
5 MB
```
Validation checklist:
```text
[ ] Reject an empty file
[ ] Reject files larger than 5 MB
[ ] Validate Content-Type
[ ] Validate the filename extension
[ ] Do not trust the filename alone
[ ] Generate your own S3 filename
[ ] Return a clear validation error
```
For stronger security later:
```text
[ ] Inspect the actual image contents
[ ] Remove image metadata
[ ] Scan files for malware
```

---
## Task 12: Create the Upload API
Create:
```text
POST /api/PetShop-items/{item_id}/images
```
Request:
```text
Content-Type: multipart/form-data
file: selected image
is_primary: true or false
```
The API must:
```text
1. Authenticate the user
2. Find the PetShop item
3. Confirm the user owns the PetShop item
4. Validate the file
5. Upload the file to S3
6. Save metadata in PetShop_images
7. Return the image information
```
Checklist:
```text
[ ] Create the upload endpoint
[ ] Accept UploadFile
[ ] Accept is_primary
[ ] Require authentication
[ ] Confirm the PetShop item exists
[ ] Confirm the user is the seller
[ ] Validate the image
[ ] Upload the file to S3
[ ] Save the database record
[ ] Return the image response
```

---
## Task 13: Handle S3 and Database Failures
Possible problem:
```text
S3 upload succeeds
        ↓
Database save fails
```
In that case, delete the uploaded S3 object.
Checklist:
```text
[ ] Upload the file to S3
[ ] Attempt to save the database record
[ ] Delete the S3 object if the DB transaction fails
[ ] Roll back the database transaction
[ ] Log the error
[ ] Return a safe error response
```
This prevents unused files from remaining in S3.

---
## Task 14: Create the Image List API
Create:
```text
GET /api/PetShop-items/{item_id}/images
```
Return:
```json
[
  {
    "id": "image-id",
    "image_url": "https://...",
    "is_primary": true,
    "sort_order": 1
  }
]
```
Checklist:
```text
[ ] Create the list-images endpoint
[ ] Find images by PetShop item ID
[ ] Sort by sort_order
[ ] Return the primary image first
[ ] Allow guests to view public product images
```

---
## Task 15: Create the Delete Image API
Create:
```text
DELETE /api/PetShop-items/{item_id}/images/{image_id}
```
The API must:
```text
1. Authenticate the user
2. Confirm the user owns the PetShop item
3. Find the image record
4. Delete the S3 object
5. Delete the database record
```
Checklist:
```text
[ ] Create the delete endpoint
[ ] Confirm the PetShop item exists
[ ] Confirm the user is the seller
[ ] Delete the object from S3
[ ] Delete the database record
[ ] Handle partial failures
```

---
## Task 16: Create the Set-Primary API
Create:
```text
PATCH /api/PetShop-items/{item_id}/images/{image_id}/primary
```
Logic:
```text
Set all item images to is_primary = false
Set the selected image to is_primary = true
```
Checklist:
```text
[ ] Create the set-primary endpoint
[ ] Confirm seller ownership
[ ] Use a database transaction
[ ] Remove the previous primary image
[ ] Set the selected image as primary
[ ] Return the updated image
```

---
## Task 17: Create the React File Input
Create a file input:
```html
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
/>
```
Checklist:
```text
[ ] Create a file input
[ ] Restrict accepted image types
[ ] Store the selected file in state
[ ] Show the selected filename
[ ] Disable upload when no file is selected
```

---
## Task 18: Add Image Preview in React
Before upload:
```text
User selects an image
        ↓
React creates a local preview URL
        ↓
React displays the preview
```
Checklist:
```text
[ ] Create a preview with URL.createObjectURL
[ ] Display the preview
[ ] Revoke old preview URLs
[ ] Show an error for invalid files
```

---
## Task 19: Send `FormData` from React
Create:
```javascript
const formData = new FormData();
formData.append("file", file);
formData.append("is_primary", "true");
```
Send:
```text
POST /api/PetShop-items/{itemId}/images
```
Checklist:
```text
[ ] Create FormData
[ ] Append the file
[ ] Append is_primary
[ ] Include the authentication token or cookie
[ ] Do not manually set the multipart Content-Type
[ ] Show an upload loading state
[ ] Handle upload errors
```
The browser must create the multipart boundary automatically.

---
## Task 20: Display Images in React
Use the image URL returned by FastAPI.
Checklist:
```text
[ ] Add images to the PetShop detail page
[ ] Show the primary image
[ ] Show the remaining image gallery
[ ] Add a fallback image
[ ] Show a loading state
[ ] Handle broken image URLs
```

---
## Task 21: Test the Upload with Postman
Before testing React, test the API directly.
Test:
```text
POST /api/PetShop-items/{item_id}/images
```
Use:
```text
Body → form-data
file → image file
is_primary → true
```
Checklist:
```text
[ ] Test a valid JPEG
[ ] Test a valid PNG
[ ] Test a valid WebP
[ ] Test a file larger than the limit
[ ] Test an unsupported file
[ ] Test without authentication
[ ] Test as a user who does not own the item
[ ] Confirm the object exists in S3
[ ] Confirm the record exists in RDS
```

---
## Task 22: Test the Complete React Workflow
Test:
```text
Seller opens an PetShop item
        ↓
Seller selects an image
        ↓
React displays a preview
        ↓
React sends the image to FastAPI
        ↓
FastAPI uploads it to S3
        ↓
FastAPI saves the metadata in RDS
        ↓
React displays the saved image
```
Checklist:
```text
[ ] Test upload from React
[ ] Confirm the request reaches FastAPI
[ ] Confirm the object exists in S3
[ ] Confirm metadata exists in RDS
[ ] Confirm the image appears in React
[ ] Refresh the page
[ ] Confirm the image still appears
```

---
# Lambda Tasks
## Task 23: Create the Image-Processing Lambda Function
Create:
```text
Function name: PetShop-image-processor
Runtime: Python
Role: PetShop-image-lambda-role
```
The function can:
```text
Read the original image
Resize it
Convert it to WebP
Create a thumbnail
Save the processed image
```
Checklist:
```text
[ ] Create PetShop-image-processor
[ ] Select a supported Python runtime
[ ] Attach PetShop-image-lambda-role
[ ] Add Pillow through a Lambda layer or deployment package
[ ] Read the source S3 object
[ ] Process the image
[ ] Save the processed object
[ ] Write logs to CloudWatch
```

---
## Task 24: Add an S3 Trigger to Lambda
Trigger Lambda when an original image is uploaded.
Example prefix:
```text
PetShop-items/
```
Prefer a more specific path if possible:
```text
PetShop-items/*/original/
```
Checklist:
```text
[ ] Open the Lambda function
[ ] Add an S3 trigger
[ ] Select PetShop-product-images
[ ] Select Object Created events
[ ] Configure a prefix for original images
[ ] Prevent Lambda from triggering itself
```
Avoid saving processed images into the same triggering prefix.
Otherwise:
```text
Lambda writes image
        ↓
S3 triggers Lambda again
        ↓
Infinite processing loop
```

---
## Task 25: Decide Whether Lambda Must Update RDS
Simpler approach:
```text
Lambda processes the image
        ↓
Lambda saves the processed image in S3
```
FastAPI can later check or save the processed URL.
More advanced approach:
```text
Lambda processes the image
        ↓
Lambda connects to private RDS
        ↓
Lambda updates processing_status and image_url
```
For the first version:
```text
[ ] Do not connect Lambda to RDS unless required
```
If Lambda must update RDS:
```text
[ ] Attach Lambda to PetShop-vpc
[ ] Select the private subnets
[ ] Use PetShop-lambda-sg
[ ] Allow PetShop-lambda-sg in PetShop-rds-sg
[ ] Read DB credentials from Secrets Manager
```

---
# Later Tasks
Do these after the basic upload works.
## Task 26: Add CloudFront
Use:
```text
User
  ↓
CloudFront
  ↓
Private S3 bucket
```
Checklist:
```text
[ ] Create a CloudFront distribution
[ ] Set the S3 bucket as the origin
[ ] Keep the bucket private
[ ] Configure Origin Access Control
[ ] Update the bucket policy
[ ] Use the CloudFront URL in image responses
```

---
## Task 27: Add Presigned Upload URLs
Later architecture:
```text
React asks FastAPI for a presigned URL
        ↓
FastAPI verifies permission
        ↓
React uploads directly to S3
        ↓
React tells FastAPI the upload finished
```
Checklist:
```text
[ ] Create an endpoint to generate a presigned upload URL
[ ] Validate the file type and object key
[ ] Use a short expiration time
[ ] Upload directly from React
[ ] Save metadata after upload
```

---
## Task 28: Add an S3 Gateway Endpoint
Create later to allow AWS resources inside the VPC to access S3 through the AWS network.
Checklist:
```text
[ ] Create an S3 Gateway Endpoint
[ ] Select PetShop-vpc
[ ] Associate the required route tables
[ ] Configure the endpoint policy
[ ] Test image upload again
```

---
# Tasks to Do Now
Complete these tasks first:
```text
[ ] 1. Decide the upload architecture
[ ] 2. Create PetShop-product-images
[ ] 3. Enable Block Public Access
[ ] 4. Enable S3 encryption
[ ] 5. Design the S3 object-key structure
[ ] 6. Create the S3 IAM policy
[ ] 7. Attach the policy to PetShop-backend-ec2-role
[ ] 8. Create the PetShop_images database model
[ ] 9. Create and run the Alembic migration
[ ] 10. Install python-multipart and boto3
[ ] 11. Add the S3 environment settings
[ ] 12. Create the FastAPI S3 service
[ ] 13. Create file validation
[ ] 14. Create the upload-image endpoint
[ ] 15. Save image metadata in RDS
[ ] 16. Delete the S3 object if the DB save fails
[ ] 17. Create the list-images endpoint
[ ] 18. Create the delete-image endpoint
[ ] 19. Create the set-primary endpoint
[ ] 20. Test the API with Postman
[ ] 21. Create the React file input
[ ] 22. Add image preview
[ ] 23. Upload with FormData
[ ] 24. Display the saved images
[ ] 25. Test the complete React–FastAPI–S3–RDS workflow
```

---
# Tasks to Do Later
```text
[ ] Create PetShop-image-processor Lambda
[ ] Trigger Lambda when an original image reaches S3
[ ] Generate thumbnails
[ ] Convert images to WebP
[ ] Add CloudFront
[ ] Add presigned upload URLs
[ ] Add an S3 Gateway Endpoint
[ ] Connect Lambda to RDS only if required
[ ] Add malware scanning
[ ] Add private-image access rules
```

---
# Do Not Do These Things
```text
[ ] Do not make the entire S3 bucket public
[ ] Do not put AWS access keys in FastAPI
[ ] Do not put AWS access keys in React
[ ] Do not use the original filename as the S3 key
[ ] Do not allow every file type
[ ] Do not trust only the file extension
[ ] Do not let users upload images to another seller's PetShop
[ ] Do not save processed images in a path that retriggers Lambda
[ ] Do not connect Lambda to RDS without a real requirement
```

---
# Final Result
After completing the tasks, your application should support:
```text
Seller uploads an PetShop image
FastAPI validates the seller and the file
The image is stored in S3
Image metadata is stored in RDS
React displays the product image
AWS access keys are not stored in the source code
The S3 bucket remains private
Lambda can later generate optimized images and thumbnails
```