terraform {
  backend "s3" {
    bucket = "backend-025215344725-ap-south-1-an"
    key = "EKS/terraform.tfstate"
    region = "ap-south-1"
    
  }
}