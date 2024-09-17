from setuptools import setup, find_packages

setup(
    name="label_bro",
    version="0.1.0",
    packages=find_packages(),
    entry_points={
        'console_scripts': [
            'label_bro = label_bro.cli:main',
        ],
    },
)
