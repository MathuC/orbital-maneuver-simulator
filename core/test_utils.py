import unittest
import utils
import math

class TestUtils(unittest.TestCase):
    def test_normalize_angle(self):
        self.assertEqual(utils.normalize_angle(0), 0)
        self.assertEqual(utils.normalize_angle(2 * math.pi), 0)
        self.assertEqual(utils.normalize_angle(2 * math.pi + math.pi), math.pi)

if __name__ == '__main__':
    unittest.main()