abstract class Repository<T> {
  Future<List<T>> fetchAll();
  Future<void> upsert(T item);
}
