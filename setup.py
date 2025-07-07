# -*- coding: utf-8 -*-

from pathlib import Path
from setuptools import setup, find_packages

with open("requirements.txt") as f:
    install_requires = f.read().strip().split("\n")

# get version from posawesome/__init__.py without importing frappe
import re

version_file = Path(__file__).parent / "posawesome" / "__init__.py"
version_match = re.search(r'^__version__\s*=\s*[\'\"]([^\'\"]+)[\'\"]',
                          version_file.read_text(), re.MULTILINE)
version = version_match.group(1) if version_match else "0.0.0"

setup(
    name="posawesome",
    version=version,
    description="POS Awesome",
    author="Yousef Restom",
    author_email="youssef@totrox.com",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=install_requires,
)
