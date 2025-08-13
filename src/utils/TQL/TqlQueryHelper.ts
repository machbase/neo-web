import TQL from '../TqlGenerator';

export const FakeSrc = `${TQL.SRC.FAKE('linspace', '0,0,0')}`;
export const FakeTQL = `${FakeSrc}\n${TQL.SINK._JSON()}`;
