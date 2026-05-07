terraform {
    backend "s3" {
    bucket = "backend-025215344725-ap-south-1-an"
    key = "ec2/terraformt.tfstate"
    region = "ap-south-1"
    }
  
}