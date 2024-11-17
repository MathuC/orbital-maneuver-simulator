from django.shortcuts import render, HttpResponse
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from .utils import process_orbit_data
from django.views.decorators.csrf import csrf_exempt
import time

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
    time.sleep(2) # to test loading screen
    return JsonResponse(processed_data)


