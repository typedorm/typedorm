type Without<T> = {[P in keyof T]?: undefined};

export type XOR<T, U> = (Without<T> & U) | (Without<U> & T);
