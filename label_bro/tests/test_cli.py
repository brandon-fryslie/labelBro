import unittest
from label_bro.cli import main
from unittest.mock import patch

class TestCLI(unittest.TestCase):
    @patch('builtins.print')
    def test_main(self, mock_print):
        with patch('sys.argv', ['cli', 'World']):
            main()
            mock_print.assert_called_with("Hello, World!")

if __name__ == '__main__':
    unittest.main()
