terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "us-west-1"
}

resource "aws_instance" "app_sevrer" {
  ami           = "ami-830c94e3"
  instance_type = "t2.micro"

  tags = {
    Name = "CapstoneServerInstance"
  }
}
