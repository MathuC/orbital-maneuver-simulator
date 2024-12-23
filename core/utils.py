import math
import numpy as np

G = 6.67430e-11
EARTH_MASS = 5.972e24

def process_orbit_data(semi_major_axis: int, ecc: float, arg: int) -> dict:
    semi_major_axis = int(semi_major_axis)
    ecc = float(ecc)
    arg = math.radians(int(arg))

    if (ecc == 0 or arg % (math.pi/2) == 0): # circle or horizontal/vertical ellipse
        max_length = 2 * semi_major_axis
    else: 
        semi_minor_axis = semi_major_axis * ((1 - (ecc ** 2)) ** 0.5)
        max_length = max(ellipse_bounding_box(semi_major_axis, semi_minor_axis, arg))

    return {"max_length": max_length}

def process_maneuver_data(start_orbit: dict, end_orbit: dict) -> dict:
    # conversion to right primitives
    start_orbit["axis"] = int(start_orbit["axis"])
    start_orbit["ecc"] = float(start_orbit["ecc"])
    start_orbit["arg"] = math.radians(int(start_orbit["arg"]))

    end_orbit["axis"] = int(end_orbit["axis"])
    end_orbit["ecc"] = float(end_orbit["ecc"])
    end_orbit["arg"] = math.radians(int(end_orbit["arg"]))


    
    return {"data": "nothing"}
    
def ellipse_bounding_box(a, b, theta):
    # finding min, max values of x, y of the ellipse using derivatives of parametric equations
    # this is done to perfectly fit the elliptical orbit in the simulation

    # parametric equations of ellipse
    # t represents eccentric anomaly technically here since an ellipse function is just a compressed/stretched circle function
    def x(t):
        return a * np.cos(theta) * np.cos(t) - b * np.sin(theta) * np.sin(t)
    def y(t):
        return a * np.sin(theta) * np.cos(t) + b * np.cos(theta) * np.sin(t)
    
    # function that returns the roots (t) of the derivatives of the parametric equations
    def dx_dt_0(k: int):
        return np.arctan(-b * np.tan(theta)/a) + k * np.pi
    def dy_dt_0(k: int):
        return np.arctan((b * np.cos(theta))/(a * np.sin(theta))) + k * np.pi
    
    x_dx_0 = [x(dx_dt_0(0)), x(dx_dt_0(1))]
    y_dy_0 = [y(dy_dt_0(0)), y(dy_dt_0(1))]
    
    return [abs(x_dx_0[0] - x_dx_0[1]), abs(y_dy_0[0] - y_dy_0[1])]

def normalize_angle(angle):
    return angle % (2 * math.pi)
