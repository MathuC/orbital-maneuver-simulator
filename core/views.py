from django.shortcuts import render, HttpResponse
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from .utils import process_orbit_data, process_maneuver_data
from django.views.decorators.csrf import csrf_exempt

# Create your views here.

def home(request):
    return render(request, 'index.html')

@require_POST
@csrf_exempt
def submit_orbit_form(request):
    axis = request.POST.get('orbit-axis-value')
    ecc = request.POST.get('orbit-ecc-value')
    arg = request.POST.get('orbit-arg-value')
    processed_data = process_orbit_data(axis, ecc, arg)
    return JsonResponse(processed_data)

@require_POST
@csrf_exempt
def submit_maneuver_form(request):
    startAxis = request.POST.get('maneuver-axis-1-value')
    startEcc = request.POST.get('maneuver-ecc-1-value')
    startArg = request.POST.get('maneuver-arg-1-value')
    endAxis = request.POST.get('maneuver-axis-2-value')
    endEcc = request.POST.get('maneuver-ecc-2-value')
    endArg = request.POST.get('maneuver-arg-2-value')
    optimization = request.POST.get('optimization-toggle')
    processed_data = process_maneuver_data({"axis": startAxis, "ecc": startEcc, "arg": startArg}, {"axis": endAxis, "ecc": endEcc, "arg": endArg}, optimization)
    return JsonResponse(processed_data)


