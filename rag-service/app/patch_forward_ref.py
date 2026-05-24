import typing
import inspect

# Python 3.12.4+ changed the signature of ForwardRef._evaluate to make
# 'recursive_guard' a keyword-only argument. We monkey-patch it only if
# recursive_guard is indeed keyword-only.
try:
    original_evaluate = typing.ForwardRef._evaluate
    sig = inspect.signature(original_evaluate)
    
    param = sig.parameters.get("recursive_guard")
    if param and param.kind == inspect.Parameter.KEYWORD_ONLY:
        def patched_evaluate(self, globalns, localns, type_params=None, *, recursive_guard=None):
            if recursive_guard is None:
                recursive_guard = frozenset()
            return original_evaluate(self, globalns, localns, type_params, recursive_guard=recursive_guard)
            
        typing.ForwardRef._evaluate = patched_evaluate
except Exception:
    pass
