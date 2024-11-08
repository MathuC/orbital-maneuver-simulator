from django.shortcuts import render, HttpResponse
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from .utils import process_orbit_data

# Create your views here.

def home(request):
    return render(request, 'index.html')

@require_POST
def submit_orbit_form(request):
    axis = request.POST.get('orbitAxisValue')
    ecc = request.POST.get('orbitEccValue')
    arg = request.POST.get('orbitArgValue')
    processed_data = process_orbit_data(axis, ecc, arg)
    return JsonResponse(processed_data)


