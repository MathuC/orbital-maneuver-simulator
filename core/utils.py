import math
import numpy as np

def process_orbit_data(semi_major_axis: int, ecc: float, arg: int) -> dict:
    semi_major_axis = int(semi_major_axis)
    ecc = float(ecc)
    arg = math.radians(float(arg))
    G = 6.67430e-11
    EARTH_MASS = 5.972e24

    semi_minor_axis = semi_major_axis * ((1 - (ecc ** 2)) ** 0.5)
    periapsis = semi_major_axis * (1 - ecc)
    apoapsis =  semi_major_axis * (1 + ecc)
    focal_distance = (semi_major_axis ** 2 - semi_minor_axis ** 2) ** 0.5


    if (ecc == 0 or arg % (math.pi/2) == 0):
        max_length = 2 * semi_major_axis
    else: 
        max_length = max_side_ellipse_bounding_box(semi_major_axis, semi_minor_axis, arg)

    orbital_period = 2 * math.pi * ((((semi_major_axis * 1000) ** 3)/(G * EARTH_MASS))) ** 0.5

    return {"semi_major_axis": semi_major_axis, "semi_minor_axis": semi_minor_axis, "eccentricity": ecc, "focal_distance": focal_distance, "periapsis": periapsis,
            "apoapsis": apoapsis, "argument_of_periapsis": arg, "max_length": max_length, "orbital_period": orbital_period}

def max_side_ellipse_bounding_box(a, b, theta):
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
    
    '''
    # no need to use fsolve since using the simplified equation for the root is more accurate
    from scipy.optimize import fsolve

    # derivatives of parametric equations
    def dx_dt(t):
        return -a * np.sin(t) * np.cos(theta) - b * np.cos(t) * np.sin(theta)
    def dy_dt(t):
        return -a * np.sin(t) * np.sin(theta) + b * np.cos(t) * np.cos(theta)

    initial_guess_dx = [0] 
    t_dx_0 = fsolve(dx_dt, initial_guess_dx) 
    x_dx_0 = [x(t_dx_0[0]), x(t_dx_0[0] + np.pi)]

    initial_guess_dy = [np.pi/2]
    t_dy_0 = fsolve(dy_dt, initial_guess_dy)
    y_dy_0 = [y(t_dy_0[0]), y(t_dy_0[0] + np.pi)]
    '''

    return max(abs(x_dx_0[0] - x_dx_0[1]), abs(y_dy_0[0] - y_dy_0[1]))
