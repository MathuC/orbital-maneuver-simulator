import unittest
import utils
import math

class TestUtils(unittest.TestCase):
    def test_normalize_angle(self):
        self.assertEqual(utils.normalize_angle(0), 0)
        self.assertEqual(utils.normalize_angle(2 * math.pi), 0)
        self.assertEqual(utils.normalize_angle(2 * math.pi + math.pi), math.pi)
        self.assertEqual(utils.normalize_angle(2 * math.pi + 3), 3)
    
    def test_standardize_angle(self):
        self.assertEqual(utils.standardize_angle(0), 0)
        self.assertEqual(utils.standardize_angle(math.pi + 1e-16), math.pi)
        self.assertEqual(utils.standardize_angle(2 * math.pi + 3.4e-16), 2 * math.pi)
    
    def test_ellipse_bounding_box(self):
        self.assertEqual(utils.ellipse_bounding_box(10, 0, 0), [20, 20])
        self.assertEqual(utils.ellipse_bounding_box(5, 0.6, 0), [10, 8])
        self.assertEqual(utils.ellipse_bounding_box(5, 0.6, 6 * math.pi), [10, 8])
        self.assertEqual(utils.ellipse_bounding_box(5, 0.6, math.pi), [10, 8])
        self.assertEqual(utils.ellipse_bounding_box(5, 0.6, math.pi/2), [8, 10])
        self.assertEqual(utils.ellipse_bounding_box(5, 0.6, 3 * math.pi/2), [8, 10])

if __name__ == '__main__':
    unittest.main()