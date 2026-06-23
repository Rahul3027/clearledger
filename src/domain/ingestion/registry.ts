import { ConnectorInterface } from "./types";
import { PeppolXmlAdapter } from "./adapters/peppol-xml-adapter";
import { ExcelCsvAdapter } from "./adapters/excel-csv-adapter";
import { StorageAdapter } from "../storage/storage-adapter";

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors: Map<string, ConnectorInterface> = new Map();

  private constructor(storage: StorageAdapter) {
    // Register built-in adapters
    this.register(new PeppolXmlAdapter(storage));
    this.register(new ExcelCsvAdapter(storage));
  }

  public static getInstance(storage: StorageAdapter): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry(storage);
    }
    return ConnectorRegistry.instance;
  }

  public register(connector: ConnectorInterface) {
    const manifest = connector.describe();
    this.connectors.set(manifest.id, connector);
  }

  public getConnector(id: string): ConnectorInterface | undefined {
    return this.connectors.get(id);
  }

  public getAllManifests() {
    return Array.from(this.connectors.values()).map(c => c.describe());
  }
}
