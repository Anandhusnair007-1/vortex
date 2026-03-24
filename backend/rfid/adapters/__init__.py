from rfid.adapters.base import RFIDAdapter
from rfid.adapters.generic_http import GenericHTTPAdapter
from rfid.adapters.zkteco import ZKTecoAdapter


def get_adapter(brand: str) -> RFIDAdapter:
    mapping = {
        "zkteco": ZKTecoAdapter,
        "generic_http": GenericHTTPAdapter,
    }
    adapter_cls = mapping.get(brand.lower(), GenericHTTPAdapter)
    return adapter_cls()
