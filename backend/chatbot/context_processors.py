def session_key(request):
    if not request.session.session_key:
        request.session.create()
        request.session["initialized"] = True
    return {"session_key": request.session.session_key}
