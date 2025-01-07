import math
import numpy as np

G = 6.67430e-11
EARTH_MASS = 5.972e24

def normalize_angle(angle):
    return angle % (2 * math.pi)

# to make up for small precision errors when adding and subtracting angles
def standardize_angle(angle):
    return round(angle * (10 ** 15))/(10 ** 15) 

def ellipse_bounding_box(a, e, theta):

    #semi minor axis
    b = a * math.sqrt(1 - (e ** 2))

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

def max_length_earth_pos(orbits):
    x_left = []
    x_right = []
    y_bottom = []
    y_top = []
    for orbit in orbits: 
        if (orbit["ecc"] == 0):
            for my_list in (x_left, x_right, y_bottom, y_top):
                my_list.append(orbit["axis"])
            continue
        bounding_box = ellipse_bounding_box(orbit["axis"], orbit["ecc"], orbit["arg"])
        semi_minor_axis =  orbit["axis"] * math.sqrt(1 - (orbit["ecc"] ** 2))
        focal_distance = math.sqrt(orbit["axis"] ** 2 - semi_minor_axis ** 2)

        # we can use the focal distance because the center of the ellipse is centered in the bounding box
        focal_distance_x = math.cos(orbit["arg"]) * focal_distance
        focal_distance_y = math.sin(orbit["arg"]) * focal_distance
        x_left.append(bounding_box[0]/2 + focal_distance_x)
        x_right.append(bounding_box[0]/2 - focal_distance_x)
        y_bottom.append(bounding_box[1]/2 + focal_distance_y)
        y_top.append(bounding_box[1]/2 - focal_distance_y)

    max_length_x = max(x_left) + max(x_right)
    max_length_y = max(y_bottom) + max(y_top)

    if (max_length_x >= max_length_y):
        max_length = max_length_x
        earth_x = max_length_x/2 - max(x_right)
        earth_y = max_length_x/2 - (max_length_x-max_length_y)/2 - max(y_top)

    else:
        max_length = max_length_y
        earth_x = max_length_y/2 - (max_length_y-max_length_x)/2 - max(x_right)
        earth_y = max_length_y/2 - max(y_top)

    return {"max_length" : max_length, "earth_pos": [earth_x, earth_y]}

def process_orbit_data(semi_major_axis: int, ecc: float, arg: int) -> dict:
    semi_major_axis = int(semi_major_axis)
    ecc = float(ecc)
    arg = math.radians(int(arg))

    if (ecc == 0 or arg % (math.pi/2) == 0): # circle or horizontal/vertical ellipse
        max_length = 2 * semi_major_axis
    else: 
        max_length = max(ellipse_bounding_box(semi_major_axis, ecc, arg))

    return {"max_length": max_length}

def process_maneuver_data(start_orbit: dict, end_orbit: dict, optimization) -> dict:
    # conversion to right primitives
    start_orbit["axis"] = int(start_orbit["axis"])
    start_orbit["ecc"] = float(start_orbit["ecc"])
    start_orbit["arg"] = math.radians(int(start_orbit["arg"]))

    end_orbit["axis"] = int(end_orbit["axis"])
    end_orbit["ecc"] = float(end_orbit["ecc"])
    end_orbit["arg"] = math.radians(int(end_orbit["arg"]))

    optimization = int(optimization) # 1 is to save fuel, 0 is to save time

    def periapsis(orbit):
        return orbit["axis"] * (1 - orbit["ecc"])

    def apoapsis(orbit):
        return orbit["axis"] * (1 + orbit["ecc"])

    def eccentricity(periapsis, apoapsis):
        return (apoapsis - periapsis)/(apoapsis + periapsis)
    
    def axis(periapsis, apoapsis):
        return (periapsis + apoapsis)/2
    
    def isEqual(orbit1, orbit2):
        return orbit1["axis"] == orbit2["axis"] and orbit1["ecc"] == orbit2["ecc"] and standardize_angle(orbit1["arg"]) == standardize_angle(orbit2["arg"])
    
    def velocity(r, semi_major_axis): # m/s
        return math.sqrt(G * EARTH_MASS * (2/(r * 1000) - 1/(semi_major_axis * 1000)))
    
    def compute_total_delta_t(orbits):
        total_delta_t = 0
        for orbit in orbits[1:-1]: # time in transfer orbits only
            angle_in_orbit = orbit["end_arg"] - orbit["start_arg"]
            total_delta_t += angle_in_orbit * math.sqrt(((orbit["axis"] * 1000) ** 3)/(G * EARTH_MASS))
        return round(total_delta_t)
    
    # fix in case normalize_angle makes end_arg be smaller than start_arg
    def fixEndArg(orbit):
        if (orbit['end_arg'] < orbit['start_arg']):
            orbit['end_arg'] = orbit['end_arg'] + 2 * math.pi

    # No end_arg can be equal to 0 since it will skip the orbit entirely so it has to be 2 * math.pi
    # 8 Strategies. Choose the one that gives you the smallest total delta v or smallest total delta t
    # Strategy 1: Start with apoapsis := apoapsis
    # Strategy 2: Start with periapsis := apoapsis
    # Strategy 3: Start with periapsis := periapsis
    # Strategy 4: Start with apoapsis := periapsis
    # Strategy 5: Start by circularizing the orbit at the current periapsis; Strategy 1 (1 or 2 yields the same result since orbits[-1] will be circular)
    # Strategy 6: Start by circularizing the orbit at the current apoapsis; Strategy 1
    # Strategy 7: Start by circularizing the orbit at the current periapsis; Strategy 3 (3 or 4 yields the same result)
    # Strategy 8: Start by circularizing the orbit at the current apoapsis; Strategy 3


    strat_outputs = []

    for strat in range(8):
        orbits = [start_orbit.copy()]
        orbits[0]["start_arg"] = 0
        burns = []

        # STEP 0
        if (orbits[-1]['ecc'] != 0 and end_orbit['ecc'] != 0 and (strat in [4, 5, 6, 7])):
            if (strat == 4 or strat == 6):
                step0 = {
                    "apsis": periapsis(orbits[-1]),
                    "end_arg": 2 * math.pi,
                    "arg_offset": 0
                }
            elif (strat == 5 or strat == 7):
                step0 = {
                    "apsis": apoapsis(orbits[-1]),
                    "end_arg": math.pi,
                    "arg_offset": math.pi
                }

            newOrbit = {
                "axis": step0['apsis'],
                "ecc": 0,
                "arg": normalize_angle(orbits[-1]['arg'] + step0['arg_offset']),
                "start_arg" : 0
            }
            orbits[-1]['end_arg'] = step0['end_arg']

            v1 = velocity(step0["apsis"], orbits[-1]["axis"])
            v2 = velocity(step0["apsis"], newOrbit["axis"])

            burns.append(round((v2-v1)))
            orbits.append(newOrbit)
    
            if (isEqual(orbits[-1], end_orbit)):
                total_delta_v = sum(map(abs, burns))
                total_delta_t = compute_total_delta_t(orbits)
                strat_outputs.append({'orbits':orbits, 'burns': burns, 'total_delta_v': total_delta_v, 'total_delta_t': total_delta_t})
                continue
                

        # STEP 1
        if (((strat in [0 ,4, 5]) and (round(apoapsis(orbits[-1])) != round(apoapsis(end_orbit)))) or 
            (strat == 1 and (round(periapsis(orbits[-1])) != round(apoapsis(end_orbit)))) or
            ((strat in [2, 6, 7]) and (round(periapsis(orbits[-1])) != round(periapsis(end_orbit)))) or 
            (strat == 3 and (round(apoapsis(orbits[-1])) != round(periapsis(end_orbit))))):
        
            # Reach end_orbit's apoapsis
            if (((strat in [0 ,4, 5]) and (round(apoapsis(orbits[-1])) != round(apoapsis(end_orbit)))) or (strat == 1 and round((periapsis(orbits[-1])) != round(apoapsis(end_orbit))))):
                newOrbit = {}

                # if orbits[-1] is a circle, then do the rotation of the orbit and the same time of this burn, same for strat 1 and 2
                if (round(periapsis(orbits[-1])) == round(apoapsis(orbits[-1]))):
                    tempArg = normalize_angle(end_orbit["arg"] - orbits[-1]['arg'])
                    orbits[-1]["end_arg"] = tempArg if tempArg != 0 else 2 * math.pi # you don't want the end arg of an orbit to be 0 
                    if (periapsis(orbits[-1]) < apoapsis(end_orbit)): # newOrbit can't be a circle, that's why not <=
                        newOrbit["arg"] = end_orbit["arg"]
                    else: # newOrbit's periapsis and apoapsis switch sides
                        newOrbit["arg"] = normalize_angle(end_orbit["arg"] + math.pi)
                
                # STRATEGY 1: apoapsis := apoapsis
                if ((strat in [0 ,4, 5]) and (round(apoapsis(orbits[-1])) != round(apoapsis(end_orbit)))):
                    newOrbit["axis"] = axis(periapsis(orbits[-1]), apoapsis(end_orbit)) 

                    if (round(periapsis(orbits[-1])) != round(apoapsis(orbits[-1]))):
                        orbits[-1]["end_arg"] = 2 * math.pi
                        if (periapsis(orbits[-1]) <= apoapsis(end_orbit)): # newOrbit is a circle or newOrbit's periapsis and apoapsis stay on the same sides
                            newOrbit["arg"] = orbits[-1]["arg"]
                        else: # newOrbit's periapsis and apoapsis switch sides
                            newOrbit["arg"] = normalize_angle(orbits[-1]["arg"] + math.pi)

                    if (periapsis(orbits[-1]) <= apoapsis(end_orbit)):
                        newOrbit["ecc"] = eccentricity(periapsis(orbits[-1]), apoapsis(end_orbit))
                        newOrbit["start_arg"] = 0
                    else:
                        newOrbit["ecc"] = eccentricity(apoapsis(end_orbit), periapsis(orbits[-1]))
                        newOrbit["start_arg"] = math.pi

                    v1 = velocity(periapsis(orbits[-1]), orbits[-1]["axis"])
                    v2 = velocity(periapsis(orbits[-1]), newOrbit["axis"])
                
                # STRATEGY 2: periapsis := apoapsis
                elif (strat == 1 and (round(periapsis(orbits[-1])) != round(apoapsis(end_orbit)))):
                    newOrbit["axis"] = axis(apoapsis(orbits[-1]), apoapsis(end_orbit)) 
                    
                    if (round(periapsis(orbits[-1])) != round(apoapsis(orbits[-1]))):
                        orbits[-1]["end_arg"] = math.pi
                        if (apoapsis(orbits[-1]) <= apoapsis(end_orbit)): 
                            newOrbit["arg"] = normalize_angle(orbits[-1]["arg"] + math.pi) 
                        else: 
                            newOrbit["arg"] = orbits[-1]["arg"]

                    if (apoapsis(orbits[-1]) <= apoapsis(end_orbit)):
                        newOrbit["ecc"] = eccentricity(apoapsis(orbits[-1]), apoapsis(end_orbit))
                        newOrbit["start_arg"] = 0
                    else:
                        newOrbit["ecc"] = eccentricity(apoapsis(end_orbit), apoapsis(orbits[-1]))
                        newOrbit["start_arg"] = math.pi

                    v1 = velocity(apoapsis(orbits[-1]), orbits[-1]["axis"])
                    v2 = velocity(apoapsis(orbits[-1]), newOrbit["axis"])
            
            # Reach end_orbit's periapsis
            elif (((strat in [2, 6, 7]) and (round(periapsis(orbits[-1])) != round(periapsis(end_orbit)))) or (strat == 3 and (round(apoapsis(orbits[-1])) != round(periapsis(end_orbit))))):
                newOrbit = {}

                if (round(periapsis(orbits[-1])) == round(apoapsis(orbits[-1]))):
                    tempArg = normalize_angle(end_orbit["arg"] - orbits[-1]['arg'] + math.pi)
                    orbits[-1]["end_arg"] = tempArg if tempArg != 0 else 2 * math.pi 
                    if (apoapsis(orbits[-1]) < periapsis(end_orbit)): # newOrbit can't be a circle, that's why not <=
                        newOrbit["arg"] = normalize_angle(end_orbit["arg"] + math.pi)
                    else: 
                        newOrbit["arg"] = end_orbit["arg"]

                # STRATEGY 3: periapsis := periapsis
                if ((strat in [2, 6, 7]) and (round(periapsis(orbits[-1])) != round(periapsis(end_orbit)))): 
                    newOrbit["axis"] = axis(apoapsis(orbits[-1]), periapsis(end_orbit))
                    
                    if (round(periapsis(orbits[-1])) != round(apoapsis(orbits[-1]))):
                        orbits[-1]["end_arg"] = math.pi
                        if (apoapsis(orbits[-1]) <= periapsis(end_orbit)):
                            newOrbit["arg"] = normalize_angle(orbits[-1]["arg"] + math.pi)
                        else: 
                            newOrbit["arg"] = orbits[-1]["arg"]

                    if (apoapsis(orbits[-1]) <= periapsis(end_orbit)):
                        newOrbit["ecc"] = eccentricity(apoapsis(orbits[-1]), periapsis(end_orbit))
                        newOrbit["start_arg"] = 0
                    else:
                        newOrbit["ecc"] = eccentricity(periapsis(end_orbit), apoapsis(orbits[-1]))
                        newOrbit["start_arg"] = math.pi

                    v1 = velocity(apoapsis(orbits[-1]), orbits[-1]["axis"])
                    v2 = velocity(apoapsis(orbits[-1]), newOrbit["axis"])
                
                # STRATEGY 4: apoapsis := periapsis
                elif (strat == 3 and (round(apoapsis(orbits[-1])) != round(periapsis(end_orbit)))):
                    newOrbit["axis"] = axis(periapsis(orbits[-1]), periapsis(end_orbit))
                    
                    if (round(periapsis(orbits[-1])) != round(apoapsis(orbits[-1]))):
                        orbits[-1]["end_arg"] = 2 * math.pi
                        if (periapsis(orbits[-1]) <= periapsis(end_orbit)): 
                            newOrbit["arg"] = orbits[-1]["arg"]
                        else: 
                            newOrbit["arg"] = normalize_angle(orbits[-1]["arg"] + math.pi) 

                    if (periapsis(orbits[-1]) <= periapsis(end_orbit)):
                        newOrbit["ecc"] = eccentricity(periapsis(orbits[-1]), periapsis(end_orbit))
                        newOrbit["start_arg"] = 0
                    else:
                        newOrbit["ecc"] = eccentricity(periapsis(end_orbit), periapsis(orbits[-1]))
                        newOrbit["start_arg"] = math.pi
                    
                    v1 = velocity(periapsis(orbits[-1]), orbits[-1]["axis"])
                    v2 = velocity(periapsis(orbits[-1]), newOrbit["axis"])

            burns.append(round((v2-v1)))
            fixEndArg(orbits[-1])
            orbits.append(newOrbit)
    
            if (isEqual(orbits[-1], end_orbit)):
                total_delta_v = sum(map(abs, burns))
                total_delta_t = compute_total_delta_t(orbits)
                strat_outputs.append({'orbits':orbits, 'burns': burns, 'total_delta_v': total_delta_v, 'total_delta_t': total_delta_t})
                continue

        # STEP 2: Make the orbit circular if you need to change arg later
        # if end_orbit is a circle, you should skip this step since it will not give the correct start and end arg, unlike STEP 3 
        if (strat in [0, 1, 4, 5]):
            step2 = {
                "correct_apsis": apoapsis(end_orbit),
                "angle_offset_1": math.pi,
                "angle_offset_2": 0
            }
        elif (strat in [2, 3, 6, 7]):
            step2 = {
                "correct_apsis": periapsis(end_orbit),
                "angle_offset_1": 0,
                "angle_offset_2": math.pi
            }

        if (strat in [0, 1, 2, 3] and
            not (round(periapsis(orbits[-1])) == round(step2["correct_apsis"]) and standardize_angle(normalize_angle(orbits[-1]["arg"] + step2["angle_offset_1"])) == standardize_angle(normalize_angle(end_orbit["arg"]))) and 
            not (round(apoapsis(orbits[-1])) == round(step2["correct_apsis"]) and standardize_angle(normalize_angle(orbits[-1]["arg"] + step2["angle_offset_2"])) == standardize_angle(normalize_angle(end_orbit["arg"]))) and 
            orbits[-1]["ecc"] != 0 and end_orbit["ecc"] != 0):

            newOrbit = {}
            newOrbit["ecc"] = 0
            newOrbit["axis"] = step2["correct_apsis"]
            newOrbit["start_arg"] = 0
            if (abs(apoapsis(orbits[-1]) - newOrbit["axis"]) < abs(periapsis(orbits[-1]) - newOrbit["axis"])): # check where new circular orbit intersects orbits[-1]
                orbits[-1]["end_arg"] = math.pi
                newOrbit["arg"] = normalize_angle(orbits[-1]["arg"] + math.pi)
            
            else:
                orbits[-1]["end_arg"] = 2 * math.pi
                newOrbit["arg"] = orbits[-1]["arg"]

            v1 = velocity(newOrbit["axis"], orbits[-1]["axis"])
            v2 = velocity(newOrbit["axis"], newOrbit["axis"]) # same r and axis because circular orbit
            
            burns.append(round((v2-v1)))
            fixEndArg(orbits[-1])
            orbits.append(newOrbit)
            # It is impossible that orbits[-1] is equal to end_orbit, so no need for isEqual check


        # STEP 3: Reach end_orbit's remaining correct apsis
        if (strat in [0, 1, 4, 5]):
            step3 = {
                "correct_apsis": apoapsis(end_orbit),
                "start_arg": math.pi
            }
        elif (strat in [2, 3, 6, 7]):
            step3 = {
                "correct_apsis": periapsis(end_orbit),
                "start_arg": 0
            }

        newOrbit = end_orbit.copy()

        if (orbits[-1]["ecc"] == 0):
            tempArg = normalize_angle(end_orbit['arg'] - orbits[-1]['arg'] + step3["start_arg"])
            orbits[-1]["end_arg"] = tempArg if tempArg != 0 else 2 * math.pi
            newOrbit["start_arg"] = step3["start_arg"]
        else:
            if (abs(apoapsis(orbits[-1]) - step3["correct_apsis"]) < abs(periapsis(orbits[-1]) - step3["correct_apsis"])): 
            # apoapsis of orbits[-1] is equal to end_orbit apoapsis; this comparison is done instead of an equality check because of precision errors
                orbits[-1]["end_arg"] = math.pi
                if (end_orbit["ecc"] != 0): 
                    newOrbit["start_arg"] = step3["start_arg"]
                else: 
                    newOrbit["start_arg"] = normalize_angle(orbits[-1]['arg'] - end_orbit['arg'] + math.pi)
            else: # periapsis of orbits[-1] is equal to end_orbit apoapsis
                orbits[-1]["end_arg"] = 2 * math.pi
                if (end_orbit["ecc"] != 0): 
                    newOrbit["start_arg"] = step3["start_arg"]
                else: 
                    newOrbit["start_arg"] = normalize_angle(orbits[-1]['arg'] - end_orbit['arg'])


        v1 = velocity(step3["correct_apsis"], orbits[-1]["axis"])
        v2 = velocity(step3["correct_apsis"], end_orbit["axis"])
        
        burns.append(round((v2-v1)))
        fixEndArg(orbits[-1])
        orbits.append(newOrbit)

        total_delta_v = sum(map(abs, burns))
        total_delta_t = compute_total_delta_t(orbits)
        strat_outputs.append({'orbits':orbits, 'burns': burns, 'total_delta_v': total_delta_v, 'total_delta_t': total_delta_t})


    # first and second criterion for sorting when finding min
    sortingKeys = ['total_delta_v', 'total_delta_t'] if optimization else ['total_delta_t', 'total_delta_v']

    optFunction = lambda x : (x[1][sortingKeys[0]], x[1][sortingKeys[1]], len(x[1]["orbits"]))
    strat_id, best_strat = min(enumerate(strat_outputs), key = optFunction)
    total_delta_v_list = [output['total_delta_v'] for output in strat_outputs]
    total_delta_t_list = [output['total_delta_t'] for output in strat_outputs]


    # test strategies
    # test_id = 5
    # strat_id, best_strat = test_id, strat_outputs[test_id]


    max_length, earth_pos = max_length_earth_pos(best_strat['orbits']).values()
    return {"orbits": best_strat['orbits'], "burns": best_strat['burns'], "max_length": max_length, 
            "earth_pos": earth_pos, "total_delta_v_list": total_delta_v_list, 
            "total_delta_t_list": total_delta_t_list, "strat_id": strat_id}